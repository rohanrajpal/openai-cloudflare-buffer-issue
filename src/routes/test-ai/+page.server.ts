import { OPENAI_API_KEY } from '$env/static/private';
import { fail } from '@sveltejs/kit';
import OpenAI from 'openai';
import { RateLimiter } from 'sveltekit-rate-limiter/server';
import { message, superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import type { Actions, PageServerLoad } from './$types';
import { captionGeneratorFormSchema } from './schema';

const limiter = new RateLimiter({
  // A rate is defined as [number, unit]
  IP: [10, 'h'], // IP address limiter
  IPUA: [5, 'm'], // IP + User Agent limiter
  cookie: {
    // Cookie limiter
    name: '_taubatauba', // Unique cookie name for this limiter
    secret: '1234', // Use $env/static/private
    rate: [5, 'm'],
    preflight: true, // Require preflight call (see load function)
  },
});

export const load: PageServerLoad = async (event) => {
  await limiter.cookieLimiter?.preflight(event);

  return {
    form: await superValidate(zod(captionGeneratorFormSchema)),
  };
};

const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

export const actions: Actions = {
  default: async (event) => {
    const form = await superValidate(event, zod(captionGeneratorFormSchema));

    if (!form.valid) {
      return fail(400, {
        form,
      });
    }

    if (await limiter.isLimited(event))
      return message(form, {
        error: 'Too many requests. Please try again later.',
      });

    const { topic, includeCommentCta, includeHashtags, includeEmojis, length } =
      form.data;

    // 		return message(form, {
    // 			generatedCaption: `
    // 🌟 "Papa Kehte Hain Bada Naam Karegaa, Beta Hamara" 🌟

    // From the time we were little, we've heard these words echo through our homes, filling our hearts with dreams and aspirations. Our parents have always believed in us, even when we doubted ourselves. They saw the potential, the strength, and the brilliance buried deep within. 🙌🏽✨

    // Today, as we stand on the brink of our dreams, let's honor that faith. Let's rise to every challenge, break every barrier, and soar to heights they always knew we could reach. It's not just about making a name; it's about making them proud. ❤️

    // To all the dreamers out there, remember: your journey is a testament
    //       `
    // 		});

    const prompt = `You are a Instagram caption expert and know how to write well engaging captions.
      Generate an Instagram caption about "${topic}". 
			Length: ${length}. 
			${includeHashtags ? 'Include relevant hashtags.' : 'Do not include hashtags.'} 
			${includeEmojis ? 'Include relevant emojis.' : 'Do not include emojis.'}
      ${
        includeCommentCta
          ? 'Include a call to action comment with a specific keyword, this is a great way to get more engagement.'
          : ''
      }`;

    try {
      const chatCompletion = await openai.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: 'gpt-4o-mini',
        max_tokens: length === 'short' ? 50 : length === 'medium' ? 100 : 150,
      });

      const generatedCaption =
        chatCompletion.choices[0]?.message?.content ||
        'Failed to generate caption.';

      return message(form, { generatedCaption });
    } catch (error) {
      console.error('Error generating caption:', error);
      return fail(500, {
        form,
        error: 'Failed to generate caption. Please try again.',
      });
    }
  },
};
