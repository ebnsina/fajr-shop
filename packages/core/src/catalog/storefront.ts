import {
	db, product, variant, category, productMedia, media, collection, collectionProduct,
	redirect, eq, and, sql, asc, desc, inArray
} from '@fajr/db';
import { publicUrl } from '../media/storage.ts';
import { descendantIds } from './categories.ts';
import { filterByFacets } from './attributes.ts';

export type ProductCard = {
	id: string;
	title: string;
	slug: string;
	summary: string | null;
	priceMinor: number;
	compareAtMinor: number | null;
	imageUrl: string | null;
	imageAlt: string | null;
	inStock: boolean;
};

export type Sort = 'newest' | 'price-asc' | 'price-desc';

// One query, no N+1. The lateral join picks each product's first image; the aggregate rolls its
// variants into a display price and a single stock flag.
const CARD_QUERY = sql`
	select
		p.id, p.title, p.slug, p.summary,
		min(v.price_minor)::int                                            as price_minor,
		max(v.compare_at_minor)::int                                       as compare_at_minor,
		bool_or(v.allow_backorder or v.stock_on_hand - v.stock_reserved > 0) as in_stock,
		img.key                                                            as image_key,
		img.alt                                                            as image_alt
	from product p
	join variant v on v.product_id = p.id and v.is_active
	left join lateral (
		select m.key, m.alt
		from product_media pm join media m on m.id = pm.media_id
		where pm.product_id = p.id
		order by pm.position
		limit 1
	) img on true
`;

type CardRow = {
	id: string; title: string; slug: string; summary: string | null;
	price_minor: number; compare_at_minor: number | null; in_stock: boolean;
	image_key: string | null; image_alt: string | null;
};

const toCard = (r: CardRow): ProductCard => ({
	id: r.id,
	title: r.title,
	slug: r.slug,
	summary: r.summary,
	priceMinor: r.price_minor,
	// Only a real markdown counts; a compare price at or below the price is noise.
	compareAtMinor: r.compare_at_minor && r.compare_at_minor > r.price_minor ? r.compare_at_minor : null,
	imageUrl: r.image_key ? publicUrl(r.image_key) : null,
	imageAlt: r.image_alt,
	inStock: r.in_stock
});

const ORDER: Record<Sort, ReturnType<typeof sql>> = {
	newest: sql`p.published_at desc nulls last`,
	'price-asc': sql`min(v.price_minor) asc`,
	'price-desc': sql`min(v.price_minor) desc`
};

export async function browse(opts: {
	categoryId?: string;
	collectionId?: string;
	search?: string;
	sort?: Sort;
	inStockOnly?: boolean;
	/** attributeId → selected values. AND across attributes, OR within one. */
	facets?: Record<string, string[]>;
	page?: number;
	perPage?: number;
} = {}): Promise<{ items: ProductCard[]; total: number; page: number; pages: number }> {
	const perPage = Math.min(opts.perPage ?? 24, 60);
	const page = Math.max(1, opts.page ?? 1);

	const conditions = [sql`p.status = 'active'`];
	let categoryIds: string[] = [];

	if (opts.categoryId) {
		categoryIds = await descendantIds(opts.categoryId);
		conditions.push(sql`p.category_id in ${sql`(${sql.join(categoryIds.map((i) => sql`${i}`), sql`, `)})`}`);
	}

	if (opts.facets && categoryIds.length) {
		const matching = await filterByFacets(categoryIds, opts.facets);
		if (matching !== null) {
			// An empty match must return nothing, not everything — the usual way
			// a filter silently stops filtering.
			if (matching.length === 0) return { items: [], total: 0, page: 1, pages: 1 };
			conditions.push(sql`p.id in ${sql`(${sql.join(matching.map((i) => sql`${i}`), sql`, `)})`}`);
		}
	}
	if (opts.collectionId) {
		conditions.push(
			sql`exists (select 1 from collection_product cp where cp.product_id = p.id and cp.collection_id = ${opts.collectionId})`
		);
	}
	if (opts.search?.trim()) {
		const q = `%${opts.search.trim()}%`;
		conditions.push(sql`(p.title ilike ${q} or p.summary ilike ${q})`);
	}

	const where = sql`where ${sql.join(conditions, sql` and `)}`;
	const having = opts.inStockOnly
		? sql`having bool_or(v.allow_backorder or v.stock_on_hand - v.stock_reserved > 0)`
		: sql``;

	const [rows, counted] = await Promise.all([
		db.read.execute(
			sql`${CARD_QUERY} ${where} group by p.id, img.key, img.alt ${having}
			    order by ${ORDER[opts.sort ?? 'newest']}
			    limit ${perPage} offset ${(page - 1) * perPage}`
		),
		db.read.execute(
			sql`select count(*)::int as n from (
			      select p.id from product p join variant v on v.product_id = p.id and v.is_active
			      ${where} group by p.id ${having}
			    ) t`
		)
	]);

	const total = Number((counted as unknown as { n: number }[])[0]?.n ?? 0);
	return {
		items: (rows as unknown as CardRow[]).map(toCard),
		total,
		page,
		pages: Math.max(1, Math.ceil(total / perPage))
	};
}

export type StorefrontProduct = {
	id: string;
	title: string;
	slug: string;
	summary: string | null;
	description: string | null;
	metaTitle: string | null;
	metaDescription: string | null;
	category: { name: string; slug: string } | null;
	images: { url: string; alt: string | null; width: number | null; height: number | null }[];
	options: { id: string; name: string; values: { id: string; value: string; swatchHex: string | null }[] }[];
	variants: {
		id: string;
		priceMinor: number;
		compareAtMinor: number | null;
		available: number;
		allowBackorder: boolean;
		optionValueIds: string[];
	}[];
};

export async function productPage(slug: string): Promise<StorefrontProduct | null> {
	const row = await db.read.query.product.findFirst({
		where: and(eq(product.slug, slug), eq(product.status, 'active'))
	});
	if (!row) return null;

	const [images, optionRows, variants, cat] = await Promise.all([
		db.read
			.select({ key: media.key, alt: media.alt, width: media.width, height: media.height })
			.from(productMedia)
			.innerJoin(media, eq(media.id, productMedia.mediaId))
			.where(eq(productMedia.productId, row.id))
			.orderBy(asc(productMedia.position)),
		db.read.execute(sql`
			select o.id, o.name, o.position,
			       ov.id as value_id, ov.value, ov.swatch_hex, ov.position as value_position
			from option o join option_value ov on ov.option_id = o.id
			where o.product_id = ${row.id}
			order by o.position, ov.position
		`),
		db.read
			.select()
			.from(variant)
			.where(and(eq(variant.productId, row.id), eq(variant.isActive, true)))
			.orderBy(asc(variant.position)),
		row.categoryId
			? db.read.query.category.findFirst({ where: eq(category.id, row.categoryId) })
			: Promise.resolve(undefined)
	]);

	const variantIds = variants.map((v) => v.id);
	const links = variantIds.length
		? await db.read.execute(
				sql`select variant_id, option_value_id from variant_option_value
				    where variant_id in ${sql`(${sql.join(variantIds.map((i) => sql`${i}`), sql`, `)})`}`
			)
		: [];

	const grouped = new Map<string, StorefrontProduct['options'][number]>();
	for (const r of optionRows as unknown as {
		id: string; name: string; value_id: string; value: string; swatch_hex: string | null;
	}[]) {
		if (!grouped.has(r.id)) grouped.set(r.id, { id: r.id, name: r.name, values: [] });
		grouped.get(r.id)!.values.push({ id: r.value_id, value: r.value, swatchHex: r.swatch_hex });
	}

	const linkRows = links as unknown as { variant_id: string; option_value_id: string }[];

	return {
		id: row.id,
		title: row.title,
		slug: row.slug,
		summary: row.summary,
		description: row.description,
		metaTitle: row.metaTitle,
		metaDescription: row.metaDescription,
		category: cat ? { name: cat.name, slug: cat.slug } : null,
		images: images.map((i) => ({ url: publicUrl(i.key), alt: i.alt, width: i.width, height: i.height })),
		options: [...grouped.values()],
		variants: variants.map((v) => ({
			id: v.id,
			priceMinor: v.priceMinor,
			compareAtMinor: v.compareAtMinor && v.compareAtMinor > v.priceMinor ? v.compareAtMinor : null,
			available: v.stockOnHand - v.stockReserved,
			allowBackorder: v.allowBackorder,
			optionValueIds: linkRows.filter((l) => l.variant_id === v.id).map((l) => l.option_value_id)
		}))
	};
}

// Slugs change; links must not rot. Checked only on the 404 path, so a live product costs
// nothing.
export async function findRedirect(fromPath: string) {
	const row = await db.read.query.redirect.findFirst({ where: eq(redirect.fromPath, fromPath) });
	if (!row) return null;
	await db.write
		.update(redirect)
		.set({ hits: sql`${redirect.hits} + 1` })
		.where(eq(redirect.id, row.id));
	return { to: encodeURI(row.toPath), status: row.statusCode };
}

/** Top-level categories with a product count, for the storefront nav. */
export async function navCategories() {
	return (await db.read.execute(sql`
		select c.id, c.name, c.slug, c.path
		from category c
		where c.is_active and c.depth = 0
		order by c.sort, c.name
	`)) as unknown as { id: string; name: string; slug: string; path: string }[];
}

export async function categoryBySlug(slug: string) {
	return db.read.query.category.findFirst({
		where: and(eq(category.slug, slug), eq(category.isActive, true))
	});
}

export const collectionBySlug = (slug: string) =>
	db.read.query.collection.findFirst({
		where: and(eq(collection.slug, slug), eq(collection.isActive, true))
	});
