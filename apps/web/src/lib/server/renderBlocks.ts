import type { RenderedPage } from '@fajr/core/cms';
import { browse, categoryBySlug, collectionBySlug } from '@fajr/core/catalog';
import { db, media, inArray } from '@fajr/db';
import { publicUrl } from '@fajr/core/media';

export type BlockData = {
	/** mediaId → public URL, for every image any block on the page references. */
	media: Record<string, string>;
	/** blockId → the products that block should show. */
	products: Record<string, Awaited<ReturnType<typeof browse>>['items']>;
	categories: Record<string, { name: string; slug: string; url: string | null }[]>;
};

// Resolve every block's data in one pass.
export async function resolveBlocks(page: RenderedPage): Promise<BlockData> {
	const mediaIds = new Set<string>();
	const collect = (id: unknown) => {
		if (typeof id === 'string' && id) mediaIds.add(id);
	};

	for (const b of page.blocks) {
		collect(b.props.mediaId);
		for (const item of (b.props.items as { mediaId?: unknown }[] | undefined) ?? []) {
			collect(item?.mediaId);
		}
	}

	const products: BlockData['products'] = {};
	const categories: BlockData['categories'] = {};
	/** blockId → the media id for each tile, in tile order. */
	const tileImages = new Map<string, (string | null)[]>();

	// Product and category blocks resolve in parallel, not one after another.
	await Promise.all(
		page.blocks.map(async (b) => {
			if (b.type === 'product-grid') {
				const p = b.props as { source: string; categorySlug?: string; collectionSlug?: string; limit: number };
				const category = p.source === 'category' && p.categorySlug ? await categoryBySlug(p.categorySlug) : null;
				const collection =
					p.source === 'collection' && p.collectionSlug ? await collectionBySlug(p.collectionSlug) : null;

				const result = await browse({
					categoryId: category?.id,
					collectionId: collection?.id,
					perPage: p.limit,
					sort: 'newest'
				});
				products[b.id] = result.items;
			}

			if (b.type === 'category-tiles') {
				const slugs = (b.props.slugs as string[]) ?? [];
				const found = await Promise.all(slugs.map((s) => categoryBySlug(s)));

				categories[b.id] = found
					.filter((c): c is NonNullable<typeof c> => Boolean(c))
					.map((c) => ({ name: c.name, slug: c.slug, url: null }));

				// Remember the image id alongside the tile, so the URL pass below
				// does not have to look every category up a second time.
				tileImages.set(
					b.id,
					found.filter(Boolean).map((c) => c!.imageMediaId ?? null)
				);
				for (const c of found) collect(c?.imageMediaId);
			}
		})
	);

	const rows = mediaIds.size
		? await db.read
				.select({ id: media.id, key: media.key })
				.from(media)
				.where(inArray(media.id, [...mediaIds]))
		: [];

	const urls = Object.fromEntries(rows.map((r) => [r.id, publicUrl(r.key)]));

	// Attach tile images from the ids captured above — no second round of
	// category lookups, which was one extra query per tile on every home render.
	for (const [blockId, imageIds] of tileImages) {
		const tiles = categories[blockId];
		if (!tiles) continue;
		for (const [i, mediaId] of imageIds.entries()) {
			if (mediaId && tiles[i]) tiles[i]!.url = urls[mediaId] ?? null;
		}
	}

	return { media: urls, products, categories };
}
