import { db, product, category, collection, page, variant, productMedia, media, brand, eq, and, sql, asc, isNull, or, gte, inArray } from '@fajr/db';
import { publicUrl } from '../media/storage.ts';

export type SitemapEntry = { loc: string; lastmod: string; changefreq?: string; priority?: number };

// Everything a crawler should see, in one query per entity type.
export async function sitemapEntries(origin: string): Promise<SitemapEntry[]> {
	const [products, categories, collections, pages] = await Promise.all([
		db.read
			.select({ slug: product.slug, updatedAt: product.updatedAt })
			.from(product)
			.where(eq(product.status, 'active')),
		db.read
			.select({ slug: category.slug, updatedAt: category.updatedAt })
			.from(category)
			.where(eq(category.isActive, true)),
		db.read
			.select({ slug: collection.slug, updatedAt: collection.updatedAt })
			.from(collection)
			.where(eq(collection.isActive, true)),
		db.read
			.select({ slug: page.slug, updatedAt: page.updatedAt, isHome: page.isHome })
			.from(page)
			.where(
				and(
					eq(page.status, 'published'),
					or(isNull(page.unpublishAt), gte(page.unpublishAt, sql`now()`))
				)
			)
	]);

	const iso = (d: Date) => d.toISOString().slice(0, 10);
	const url = (path: string) => `${origin}${encodeURI(path)}`;

	return [
		{ loc: origin, lastmod: iso(new Date()), changefreq: 'daily', priority: 1 },
		...categories.map((c) => ({ loc: url(`/c/${c.slug}`), lastmod: iso(c.updatedAt), changefreq: 'daily', priority: 0.8 })),
		...products.map((p) => ({ loc: url(`/products/${p.slug}`), lastmod: iso(p.updatedAt), changefreq: 'weekly', priority: 0.7 })),
		...collections.map((c) => ({ loc: url(`/collections/${c.slug}`), lastmod: iso(c.updatedAt), changefreq: 'weekly', priority: 0.6 })),
		// The home page is already listed as the origin; listing it twice under
		// /p/<slug> would be a duplicate for the same content.
		...pages.filter((p) => !p.isHome).map((p) => ({ loc: url(`/p/${p.slug}`), lastmod: iso(p.updatedAt), changefreq: 'weekly', priority: 0.5 }))
	];
}

export type FeedItem = {
	id: string;
	title: string;
	description: string;
	link: string;
	imageLink: string | null;
	availability: 'in stock' | 'out of stock';
	priceMinor: number;
	salePriceMinor: number | null;
	currency: string;
	brand: string;
	condition: 'new';
	itemGroupId: string;
};

// One row per *variant*, which is what Facebook and Google both want: a shopper clicking an ad
// for the red one should land on the red one.
export async function feedItems(origin: string, currency = 'BDT'): Promise<FeedItem[]> {
	const rows = await db.read
		.select({
			variantId: variant.id,
			sku: variant.sku,
			priceMinor: variant.priceMinor,
			compareAtMinor: variant.compareAtMinor,
			stockOnHand: variant.stockOnHand,
			stockReserved: variant.stockReserved,
			allowBackorder: variant.allowBackorder,
			productId: product.id,
			title: product.title,
			slug: product.slug,
			summary: product.summary,
			description: product.description,
			brandName: brand.name
		})
		.from(variant)
		.innerJoin(product, eq(product.id, variant.productId))
		.leftJoin(brand, eq(brand.id, product.brandId))
		.where(and(eq(product.status, 'active'), eq(variant.isActive, true)));

	if (rows.length === 0) return [];

	const productIds = [...new Set(rows.map((r) => r.productId))];
	const images = await db.read
		.select({ productId: productMedia.productId, key: media.key, position: productMedia.position })
		.from(productMedia)
		.innerJoin(media, eq(media.id, productMedia.mediaId))
		.where(inArray(productMedia.productId, productIds))
		.orderBy(asc(productMedia.position));

	const firstImage = new Map<string, string>();
	for (const img of images) if (!firstImage.has(img.productId)) firstImage.set(img.productId, img.key);

	const titles = await variantTitleMap(rows.map((r) => r.variantId));

	return rows.map((r) => {
		const suffix = titles.get(r.variantId);
		const onSale = r.compareAtMinor !== null && r.compareAtMinor > r.priceMinor;
		const key = firstImage.get(r.productId);

		return {
			id: r.sku || r.variantId,
			title: suffix ? `${r.title} — ${suffix}` : r.title,
			// Feeds reject empty descriptions, so fall back down the chain.
			description: r.summary || r.description || r.title,
			link: `${origin}${encodeURI(`/products/${r.slug}`)}`,
			imageLink: key ? publicUrl(key) : null,
			availability:
				r.allowBackorder || r.stockOnHand - r.stockReserved > 0 ? 'in stock' : 'out of stock',
			// When there is a markdown, the feed's "price" is the original and
			// "sale_price" is what we charge — that is what shows a strikethrough.
			priceMinor: onSale ? r.compareAtMinor! : r.priceMinor,
			salePriceMinor: onSale ? r.priceMinor : null,
			currency,
			brand: r.brandName ?? '',
			condition: 'new' as const,
			itemGroupId: r.productId
		};
	});
}

async function variantTitleMap(variantIds: string[]): Promise<Map<string, string>> {
	if (!variantIds.length) return new Map();
	const rows = (await db.read.execute(sql`
		select vov.variant_id, string_agg(ov.value, ' / ' order by o.position) as title
		from variant_option_value vov
		join option_value ov on ov.id = vov.option_value_id
		join option o on o.id = ov.option_id
		where vov.variant_id in ${sql`(${sql.join(variantIds.map((i) => sql`${i}`), sql`, `)})`}
		group by vov.variant_id
	`)) as unknown as { variant_id: string; title: string }[];
	return new Map(rows.map((r) => [r.variant_id, r.title]));
}
