import { z } from 'zod';

export const lengthOptions = ['short', 'medium', 'long'] as const;

export const captionGeneratorFormSchema = z.object({
	topic: z.string().min(20).max(1000),
	// .default('Launching a new product: Spur Affiliates for marketing random shit together'),
	includeHashtags: z.boolean().default(true),
	includeEmojis: z.boolean().default(true),
	includeCommentCta: z.boolean().default(false),
	length: z.enum(lengthOptions).default('medium')
});

export type CaptionGeneratorFormSchema = typeof captionGeneratorFormSchema;
