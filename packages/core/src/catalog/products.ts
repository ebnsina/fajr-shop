import {
	db, product, variant, option, optionValue, variantOptionValue, productMedia, redirect,
	newId, eq, and, or, sql, asc, desc, inArray
} from '@fajr/db';
import { uniqueSlug } from './slug.ts';
import { descendantIds } from './categories.ts';
import { audit } from '../audit/index.ts';

export type VariantInput = {
	id?: string;
	sku?: string | null;
	priceMinor: number;
	compareAtMinor?: number | null;
	costMinor?: number | null;
	stockOnHand?: number;
	allowBackorder?: boolean;
	weightGrams?: number | null;
	optionValueIds?: string[];
	isActive?: boolean;
};

export type ProductInput = {
	title: string;
	slug?: string;
	description?: string | null;
	summary?: string | null;
	brandId?: string | null;
	categoryId?: string | null;
	status?: 'draft' | 'active' | 'archived';
	metaTitle?: string | null;
	metaDescription?: string | null;
};

const slugTaken = (slug: string, exceptId?: string) =>
	db.read
		.select({ id: product.id })
		.from(product)
		.where(eq(product.slug, slug))
		.limit(1)
		.then((rows) => rows.length > 0 && rows[0]!.id !== exceptId);

/** A product always has at least one variant — the "no options" case is one row. */
export async function createProduct(
	input: ProductInput & { variants?: VariantInput[] },
	ctx: { actorId?: string | null } = {}
): Promise<string> {
	const id = newId('prd');
	const slug = await uniqueSlug(input.slug ?? input.title, (s) => slugTaken(s), 'product');

	await db.write.transaction(async (tx) => {
		await tx.insert(product).values({
			id,
			title: input.title,
			slug,
			description: input.description ?? null,
			summary: input.summary ?? null,
			brandId: input.brandId ?? null,
			categoryId: input.categoryId ?? null,
			status: input.status ?? 'draft',
			publishedAt: input.status === 'active' ? new Date() : null,
			metaTitle: input.metaTitle ?? null,
			metaDescription: input.metaDescription ?? null
		});

		const variants = input.variants?.length ? input.variants : [{ priceMinor: 0 }];
		for (const [i, v] of variants.entries()) {
			await tx.insert(variant).values({
				id: v.id ?? newId('var'),
				productId: id,
				sku: v.sku || null,
				priceMinor: v.priceMinor,
				compareAtMinor: v.compareAtMinor ?? null,
				costMinor: v.costMinor ?? null,
				stockOnHand: v.stockOnHand ?? 0,
				allowBackorder: v.allowBackorder ?? false,
				weightGrams: v.weightGrams ?? null,
				position: i
			});
		}
	});

	await audit({ actorType: 'admin', actorId: ctx.actorId, action: 'product.create', entity: 'product', entityId: id });
	return id;
}

// A changed slug writes a redirect from the old path, so an ad or a shared link never 404s.
// This is the cheapest SEO insurance in the codebase.
export async function updateProduct(
	id: string,
	patch: Partial<ProductInput>,
	ctx: { actorId?: string | null } = {}
): Promise<void> {
	const current = await db.read.query.product.findFirst({ where: eq(product.id, id) });
	if (!current) throw new Error(`product ${id} not found`);

	const next: Record<string, unknown> = { updatedAt: new Date() };
	for (const key of ['title', 'description', 'summary', 'brandId', 'categoryId', 'metaTitle', 'metaDescription'] as const) {
		if (patch[key] !== undefined) next[key] = patch[key];
	}

	if (patch.status !== undefined) {
		next.status = patch.status;
		// First publish stamps the date; unpublishing and republishing keeps it.
		if (patch.status === 'active' && !current.publishedAt) next.publishedAt = new Date();
	}

	if (patch.slug !== undefined) {
		const slug = await uniqueSlug(patch.slug, (s) => slugTaken(s, id), 'product');
		if (slug !== current.slug) {
			next.slug = slug;
			await db.write
				.insert(redirect)
				.values({ id: newId('rdr'), fromPath: `/products/${current.slug}`, toPath: `/products/${slug}` })
				.onConflictDoUpdate({
					target: redirect.fromPath,
					set: { toPath: `/products/${slug}`, updatedAt: new Date() }
				});
		}
	}

	await db.write.update(product).set(next).where(eq(product.id, id));
	await audit({
		actorType: 'admin',
		actorId: ctx.actorId,
		action: 'product.update',
		entity: 'product',
		entityId: id,
		meta: { changed: Object.keys(next).filter((k) => k !== 'updatedAt') }
	});
}

/** Archive, don't delete — an order line references this product forever. */
export async function archiveProduct(id: string, ctx: { actorId?: string | null } = {}): Promise<void> {
	await db.write.update(product).set({ status: 'archived', updatedAt: new Date() }).where(eq(product.id, id));
	await audit({ actorType: 'admin', actorId: ctx.actorId, action: 'product.archive', entity: 'product', entityId: id });
}

// ── options and variants ────────────────────────────────────────────────────

export async function setOptions(
	productId: string,
	options: { name: string; values: { value: string; swatchHex?: string | null }[] }[]
): Promise<void> {
	await db.write.transaction(async (tx) => {
		// Cascade clears option_value and variant_option_value with it.
		await tx.delete(option).where(eq(option.productId, productId));
		for (const [i, opt] of options.entries()) {
			const optionId = newId('opt');
			await tx.insert(option).values({ id: optionId, productId, name: opt.name, position: i });
			for (const [j, val] of opt.values.entries()) {
				await tx.insert(optionValue).values({
					id: newId('ov'),
					optionId,
					value: val.value,
					swatchHex: val.swatchHex ?? null,
					position: j
				});
			}
		}
	});
}

export async function replaceVariants(productId: string, variants: VariantInput[]): Promise<void> {
	await db.write.transaction(async (tx) => {
		await tx.delete(variant).where(eq(variant.productId, productId));
		for (const [i, v] of variants.entries()) {
			const id = v.id ?? newId('var');
			await tx.insert(variant).values({
				id,
				productId,
				sku: v.sku || null,
				priceMinor: v.priceMinor,
				compareAtMinor: v.compareAtMinor ?? null,
				costMinor: v.costMinor ?? null,
				stockOnHand: v.stockOnHand ?? 0,
				allowBackorder: v.allowBackorder ?? false,
				weightGrams: v.weightGrams ?? null,
				isActive: v.isActive ?? true,
				position: i
			});
			for (const ovId of v.optionValueIds ?? []) {
				await tx.insert(variantOptionValue).values({ variantId: id, optionValueId: ovId });
			}
		}
	});
}

// Reserve stock without ever reading it first. Zero rows back means sold out. No lock, no
// Redis, no queue — this is the whole flash-sale story.
export async function reserveStock(variantId: string, qty: number): Promise<{ ok: boolean; remaining?: number }> {
	const rows = await db.write
		.update(variant)
		.set({ stockReserved: sql`${variant.stockReserved} + ${qty}` })
		.where(
			and(
				eq(variant.id, variantId),
				or(
					eq(variant.allowBackorder, true),
					sql`${variant.stockOnHand} - ${variant.stockReserved} >= ${qty}`
				)
			)
		)
		.returning({ remaining: sql<number>`${variant.stockOnHand} - ${variant.stockReserved}` });

	return rows.length ? { ok: true, remaining: rows[0]!.remaining } : { ok: false };
}

/** Abandoned checkout, or a cancelled order before dispatch. */
export async function releaseStock(variantId: string, qty: number): Promise<void> {
	await db.write
		.update(variant)
		.set({ stockReserved: sql`greatest(0, ${variant.stockReserved} - ${qty})` })
		.where(eq(variant.id, variantId));
}

/** Dispatch: the goods left the building, so the reservation becomes a decrement. */
export async function commitStock(variantId: string, qty: number): Promise<void> {
	await db.write
		.update(variant)
		.set({
			stockOnHand: sql`${variant.stockOnHand} - ${qty}`,
			stockReserved: sql`greatest(0, ${variant.stockReserved} - ${qty})`
		})
		.where(eq(variant.id, variantId));
}

export async function adjustStock(
	variantId: string,
	delta: number,
	reason: string,
	ctx: { actorId?: string | null } = {}
): Promise<void> {
	await db.write
		.update(variant)
		.set({ stockOnHand: sql`${variant.stockOnHand} + ${delta}`, updatedAt: new Date() })
		.where(eq(variant.id, variantId));
	await audit({
		actorType: 'admin',
		actorId: ctx.actorId,
		action: 'stock.adjust',
		entity: 'variant',
		entityId: variantId,
		meta: { delta, reason }
	});
}

// ── reads ───────────────────────────────────────────────────────────────────

export async function getProduct(id: string) {
	const row = await db.read.query.product.findFirst({ where: eq(product.id, id) });
	return row ? hydrate(row) : null;
}

export async function getProductBySlug(slug: string) {
	const row = await db.read.query.product.findFirst({ where: eq(product.slug, slug) });
	return row ? hydrate(row) : null;
}

/** One query per relation, never one per row — the N+1 in the listing is the wall. */
async function hydrate(row: typeof product.$inferSelect) {
	const [variants, options, images] = await Promise.all([
		db.read.select().from(variant).where(eq(variant.productId, row.id)).orderBy(asc(variant.position)),
		db.read
			.select({
				id: option.id,
				name: option.name,
				position: option.position,
				valueId: optionValue.id,
				value: optionValue.value,
				swatchHex: optionValue.swatchHex,
				valuePosition: optionValue.position
			})
			.from(option)
			.leftJoin(optionValue, eq(optionValue.optionId, option.id))
			.where(eq(option.productId, row.id))
			.orderBy(asc(option.position), asc(optionValue.position)),
		db.read
			.select()
			.from(productMedia)
			.where(eq(productMedia.productId, row.id))
			.orderBy(asc(productMedia.position))
	]);

	const variantIds = variants.map((v) => v.id);
	const links = variantIds.length
		? await db.read.select().from(variantOptionValue).where(inArray(variantOptionValue.variantId, variantIds))
		: [];

	const grouped = new Map<string, { id: string; name: string; values: { id: string; value: string; swatchHex: string | null }[] }>();
	for (const r of options) {
		if (!grouped.has(r.id)) grouped.set(r.id, { id: r.id, name: r.name, values: [] });
		if (r.valueId) grouped.get(r.id)!.values.push({ id: r.valueId, value: r.value!, swatchHex: r.swatchHex });
	}

	return {
		...row,
		options: [...grouped.values()],
		images,
		variants: variants.map((v) => ({
			...v,
			available: v.stockOnHand - v.stockReserved,
			optionValueIds: links.filter((l) => l.variantId === v.id).map((l) => l.optionValueId)
		}))
	};
}

export type ProductListFilter = {
	search?: string;
	status?: 'draft' | 'active' | 'archived';
	categoryId?: string;
	/** Include products in child categories too. */
	includeDescendants?: boolean;
	brandId?: string;
	limit?: number;
	offset?: number;
};

export async function listProducts(filter: ProductListFilter = {}) {
	const where = [];
	if (filter.status) where.push(eq(product.status, filter.status));
	if (filter.brandId) where.push(eq(product.brandId, filter.brandId));
	if (filter.categoryId) {
		const ids = filter.includeDescendants ? await descendantIds(filter.categoryId) : [filter.categoryId];
		where.push(inArray(product.categoryId, ids));
	}
	if (filter.search?.trim()) {
		// Trigram-friendly. Bangla has no Postgres stemmer, so this is the ceiling.
		const q = `%${filter.search.trim()}%`;
		where.push(sql`(${product.title} ilike ${q} or ${product.summary} ilike ${q})`);
	}

	const limit = Math.min(filter.limit ?? 50, 200);
	const clause = where.length ? and(...where) : undefined;

	const [rows, counted] = await Promise.all([
		db.read
			.select({
				id: product.id,
				title: product.title,
				slug: product.slug,
				status: product.status,
				categoryId: product.categoryId,
				updatedAt: product.updatedAt,
				priceMinor: sql<number | null>`min(${variant.priceMinor})`,
				stock: sql<number>`coalesce(sum(${variant.stockOnHand} - ${variant.stockReserved}), 0)`,
				variantCount: sql<number>`count(${variant.id})`
			})
			.from(product)
			.leftJoin(variant, eq(variant.productId, product.id))
			.where(clause)
			.groupBy(product.id)
			.orderBy(desc(product.updatedAt))
			.limit(limit)
			.offset(filter.offset ?? 0),
		db.read.select({ n: sql<number>`count(*)` }).from(product).where(clause)
	]);

	return { rows, total: Number(counted[0]?.n ?? 0) };
}

export async function setProductImages(productId: string, mediaIds: string[]): Promise<void> {
	await db.write.transaction(async (tx) => {
		await tx.delete(productMedia).where(eq(productMedia.productId, productId));
		for (const [i, mediaId] of mediaIds.entries()) {
			await tx.insert(productMedia).values({ productId, mediaId, position: i });
		}
	});
}
