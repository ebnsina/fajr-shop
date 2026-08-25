import { z } from 'zod';

// One schema per block type.

const link = z.object({
	label: z.string().trim().max(60).default(''),
	href: z.string().trim().max(300).default('')
});

export const blockSchemas = {
	hero: z.object({
		heading: z.string().trim().max(120).default('New arrivals'),
		subheading: z.string().trim().max(200).default(''),
		mediaId: z.string().nullish(),
		align: z.enum(['start', 'center']).default('center'),
		/** Dark overlay percentage — the only reliable way to keep text legible. */
		overlay: z.coerce.number().min(0).max(80).default(30),
		cta: link.default({ label: '', href: '' })
	}),

	'rich-text': z.object({
		heading: z.string().trim().max(120).default(''),
		/** Plain text, rendered with line breaks. No user HTML: that is an XSS hole. */
		body: z.string().max(4000).default('')
	}),

	'product-grid': z.object({
		heading: z.string().trim().max(120).default('Shop'),
		source: z.enum(['newest', 'category', 'collection']).default('newest'),
		categorySlug: z.string().trim().max(80).nullish(),
		collectionSlug: z.string().trim().max(80).nullish(),
		limit: z.coerce.number().int().min(2).max(24).default(8)
	}),

	'category-tiles': z.object({
		heading: z.string().trim().max(120).default('Browse'),
		slugs: z.array(z.string().trim()).max(12).default([])
	}),

	countdown: z.object({
		heading: z.string().trim().max(120).default('Offer ends in'),
		/** ISO instant. Stored in UTC like everything else. */
		endsAt: z.string().datetime().nullish(),
		subheading: z.string().trim().max(200).default('')
	}),

	'usp-bar': z.object({
		items: z
			.array(z.object({ title: z.string().trim().max(60), body: z.string().trim().max(120).default('') }))
			.max(4)
			.default([
				{ title: 'Cash on delivery', body: 'Across Bangladesh' },
				{ title: 'Easy returns', body: 'Within 7 days' }
			])
	}),

	faq: z.object({
		heading: z.string().trim().max(120).default('Questions'),
		items: z
			.array(z.object({ q: z.string().trim().max(200), a: z.string().trim().max(1000) }))
			.max(20)
			.default([])
	}),

	testimonials: z.object({
		heading: z.string().trim().max(120).default('What customers say'),
		items: z
			.array(
				z.object({
					quote: z.string().trim().max(400),
					name: z.string().trim().max(60).default(''),
					mediaId: z.string().nullish()
				})
			)
			.max(12)
			.default([])
	}),

	video: z.object({
		heading: z.string().trim().max(120).default(''),
		/** BD ads are video-first, so this is a first-class block, not an embed hack. */
		youtubeId: z.string().trim().max(20).default(''),
		caption: z.string().trim().max(200).default('')
	}),

	'cta-banner': z.object({
		heading: z.string().trim().max(120).default(''),
		body: z.string().trim().max(300).default(''),
		cta: link.default({ label: '', href: '' }),
		tone: z.enum(['accent', 'quiet']).default('accent')
	})
} as const;

export type BlockType = keyof typeof blockSchemas;

export const BLOCK_TYPES = Object.keys(blockSchemas) as BlockType[];

export const BLOCK_LABELS: Record<BlockType, string> = {
	hero: 'Hero',
	'rich-text': 'Text',
	'product-grid': 'Products',
	'category-tiles': 'Categories',
	countdown: 'Countdown',
	'usp-bar': 'Promises',
	faq: 'FAQ',
	testimonials: 'Testimonials',
	video: 'Video',
	'cta-banner': 'Call to action'
};

export const isBlockType = (t: string): t is BlockType => t in blockSchemas;

/** Every block can be created empty, because the editor adds it before it is filled. */
export function defaultProps(type: BlockType): Record<string, unknown> {
	return blockSchemas[type].parse({}) as Record<string, unknown>;
}

// Unknown props are dropped and bad ones fall back to defaults, so a block saved by an older
// version of the app can never crash the storefront.
export function parseProps(type: string, props: unknown): Record<string, unknown> | null {
	if (!isBlockType(type)) return null;
	const result = blockSchemas[type].safeParse(props ?? {});
	return (result.success ? result.data : blockSchemas[type].parse({})) as Record<string, unknown>;
}

export const pageForm = z.object({
	title: z.string().trim().min(1, 'Give the page a title').max(120),
	slug: z.string().trim().max(80).default(''),
	status: z.enum(['draft', 'published']).default('draft'),
	metaTitle: z.string().trim().max(70).nullish(),
	metaDescription: z.string().trim().max(160).nullish(),
	themeOverride: z.string().trim().max(20).nullish(),
	pixelId: z.string().trim().max(40).nullish(),
	unpublishAt: z.string().nullish()
});

export type PageForm = z.infer<typeof pageForm>;
