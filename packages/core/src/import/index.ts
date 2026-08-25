import { db, product, variant, category, brand, redirect, newId, eq, and, sql } from '@fajr/db';
import { toSheet, type Sheet } from './csv.ts';
import { detectPreset, PRESETS, type Mapping, type FieldKey, type Preset } from './presets.ts';
import { createProduct, setOptions, replaceVariants, slugify, uniqueSlug } from '../catalog/index.ts';
import { audit } from '../audit/index.ts';

export * from './csv.ts';
export * from './presets.ts';

export type RowError = { row: number; handle: string; reason: string };

export type ImportResult = {
	created: number;
	updated: number;
	skipped: number;
	errors: RowError[];
	redirects: number;
};

/** Prices arrive as decimal strings. Integer maths, never a float. */
function toMinor(value: string | undefined): number | null {
	if (!value) return null;
	const cleaned = value.replace(/[^\d.-]/g, '').trim();
	if (!cleaned) return null;
	const n = Number(cleaned);
	if (!Number.isFinite(n)) return null;
	return Math.round(n * 100);
}

const get = (row: Record<string, string>, mapping: Mapping, key: FieldKey) =>
	mapping[key] ? (row[mapping[key]!] ?? '').trim() : '';

export type PlannedProduct = {
	handle: string;
	title: string;
	description: string | null;
	summary: string | null;
	categoryName: string | null;
	brandName: string | null;
	status: 'active' | 'draft';
	options: { name: string; values: string[] }[];
	variants: {
		sku: string | null;
		priceMinor: number;
		compareAtMinor: number | null;
		costMinor: number | null;
		stock: number;
		optionValues: string[];
	}[];
	imageUrls: string[];
};

export type Plan = { products: PlannedProduct[]; errors: RowError[] };

// Build the plan without touching the database, so the merchant sees exactly what will happen
// before it happens. A half-finished catalog import is miserable to unwind.
export function planImport(sheet: Sheet, mapping: Mapping, groupBy: FieldKey = 'handle'): Plan {
	const byHandle = new Map<string, PlannedProduct>();
	const errors: RowError[] = [];

	for (const [i, row] of sheet.rows.entries()) {
		const lineNo = i + 2; // 1-indexed, plus the header
		const handle = get(row, mapping, groupBy) || slugify(get(row, mapping, 'title'));

		if (!handle) {
			errors.push({ row: lineNo, handle: '', reason: 'No handle or title on this row' });
			continue;
		}

		const title = get(row, mapping, 'title');
		let planned = byHandle.get(handle);

		if (!planned) {
			if (!title) {
				// Shopify emits image-only rows after the first row of a product.
				errors.push({ row: lineNo, handle, reason: 'First row for this product has no title' });
				continue;
			}
			const rawStatus = get(row, mapping, 'status').toLowerCase();
			planned = {
				handle,
				title,
				description: get(row, mapping, 'description') || null,
				summary: get(row, mapping, 'summary') || null,
				categoryName: get(row, mapping, 'category') || null,
				brandName: get(row, mapping, 'brand') || null,
				// Anything not explicitly published lands as a draft: importing somebody's archived catalog
				// straight onto a live shop is worse than making them press publish.
				status: ['active', 'publish', 'published', '1', 'true'].includes(rawStatus) ? 'active' : 'draft',
				options: [],
				variants: [],
				imageUrls: []
			};
			byHandle.set(handle, planned);
		}

		const image = get(row, mapping, 'imageUrl');
		// WooCommerce puts every image in one comma-separated cell.
		for (const url of image.split(',').map((u) => u.trim()).filter(Boolean)) {
			if (!planned.imageUrls.includes(url)) planned.imageUrls.push(url);
		}

		const priceMinor = toMinor(get(row, mapping, 'price'));
		if (priceMinor === null) continue; // an image-only row has no variant

		const optionValues: string[] = [];
		for (const [nameKey, valueKey] of [
			['option1Name', 'option1Value'],
			['option2Name', 'option2Value']
		] as const) {
			const name = get(row, mapping, nameKey);
			const value = get(row, mapping, valueKey);
			if (!name || !value || value.toLowerCase() === 'default title') continue;

			optionValues.push(value);
			const existing = planned.options.find((o) => o.name === name);
			if (existing) {
				if (!existing.values.includes(value)) existing.values.push(value);
			} else {
				planned.options.push({ name, values: [value] });
			}
		}

		const compareAt = toMinor(get(row, mapping, 'compareAt'));

		planned.variants.push({
			sku: get(row, mapping, 'sku') || null,
			priceMinor,
			// A "sale price" below the price is the sale, not the compare-at.
			compareAtMinor: compareAt !== null && compareAt > priceMinor ? compareAt : null,
			costMinor: toMinor(get(row, mapping, 'cost')),
			stock: Math.max(0, Math.round(Number(get(row, mapping, 'stock') || 0)) || 0),
			optionValues
		});
	}

	// A product with no priced row cannot be sold.
	for (const [handle, planned] of byHandle) {
		if (planned.variants.length === 0) {
			errors.push({ row: 0, handle, reason: 'No row with a price' });
			byHandle.delete(handle);
		}
	}

	return { products: [...byHandle.values()], errors };
}

async function findOrCreateCategory(name: string, cache: Map<string, string>): Promise<string> {
	const key = name.trim();
	if (cache.has(key)) return cache.get(key)!;

	// Shopify writes "Apparel > Sarees"; the leaf is the useful part.
	const leaf = key.split('>').pop()!.trim();
	const slug = slugify(leaf);

	const existing = await db.read.query.category.findFirst({ where: eq(category.slug, slug) });
	if (existing) {
		cache.set(key, existing.id);
		return existing.id;
	}

	const id = newId('cat');
	await db.write.insert(category).values({
		id,
		path: `/${id}/`,
		depth: 0,
		name: leaf,
		slug: await uniqueSlug(leaf, async (s) => {
			const row = await db.read.query.category.findFirst({ where: eq(category.slug, s) });
			return Boolean(row);
		}, 'category')
	});
	cache.set(key, id);
	return id;
}

async function findOrCreateBrand(name: string, cache: Map<string, string>): Promise<string> {
	const key = name.trim();
	if (cache.has(key)) return cache.get(key)!;

	const slug = slugify(key);
	const existing = await db.read.query.brand.findFirst({ where: eq(brand.slug, slug) });
	if (existing) {
		cache.set(key, existing.id);
		return existing.id;
	}

	const id = newId('brd');
	await db.write.insert(brand).values({ id, name: key, slug });
	cache.set(key, id);
	return id;
}

// Apply a plan. Keyed on (source, external_id), so re-running an import updates rather than
// duplicating. Without that the second run doubles the catalog and there is no clean way back.
export async function applyImport(
	plan: Plan,
	opts: { source: string; oldUrlPattern?: string | null }
): Promise<ImportResult> {
	const result: ImportResult = {
		created: 0,
		updated: 0,
		skipped: 0,
		errors: [...plan.errors],
		redirects: 0
	};

	const categories = new Map<string, string>();
	const brands = new Map<string, string>();

	for (const planned of plan.products) {
		try {
			const categoryId = planned.categoryName
				? await findOrCreateCategory(planned.categoryName, categories)
				: null;
			const brandId = planned.brandName ? await findOrCreateBrand(planned.brandName, brands) : null;

			const existing = await db.read.query.product.findFirst({
				where: and(eq(product.source, opts.source), eq(product.externalId, planned.handle))
			});

			let productId: string;

			if (existing) {
				productId = existing.id;
				await db.write
					.update(product)
					.set({
						title: planned.title,
						description: planned.description,
						summary: planned.summary,
						categoryId,
						brandId,
						updatedAt: new Date()
					})
					.where(eq(product.id, productId));
				result.updated += 1;
			} else {
				productId = await createProduct({
					title: planned.title,
					description: planned.description,
					summary: planned.summary,
					categoryId,
					brandId,
					status: planned.status
				});
				await db.write
					.update(product)
					.set({ source: opts.source, externalId: planned.handle })
					.where(eq(product.id, productId));
				result.created += 1;
			}

			if (planned.options.length) {
				await setOptions(
					productId,
					planned.options.map((o) => ({ name: o.name, values: o.values.map((v) => ({ value: v })) }))
				);
			}

			const hydrated = await db.read.execute(sql`
				select ov.id, ov.value from option_value ov
				join option o on o.id = ov.option_id
				where o.product_id = ${productId}
			`);
			const valueIds = new Map(
				(hydrated as unknown as { id: string; value: string }[]).map((r) => [r.value, r.id])
			);

			await replaceVariants(
				productId,
				planned.variants.map((v) => ({
					sku: v.sku,
					priceMinor: v.priceMinor,
					compareAtMinor: v.compareAtMinor,
					costMinor: v.costMinor,
					stockOnHand: v.stock,
					optionValueIds: v.optionValues
						.map((value) => valueIds.get(value))
						.filter((id): id is string => Boolean(id))
				}))
			);

			// The redirect map is the highest-value part of a migration: dropping the old URLs throws
			// away the store's organic traffic on day one.
			if (opts.oldUrlPattern) {
				const fresh = await db.read.query.product.findFirst({ where: eq(product.id, productId) });
				const fromPath = opts.oldUrlPattern.replace('{handle}', planned.handle);
				await db.write
					.insert(redirect)
					.values({ id: newId('rdr'), fromPath, toPath: `/products/${fresh!.slug}` })
					.onConflictDoUpdate({
						target: redirect.fromPath,
						set: { toPath: `/products/${fresh!.slug}`, updatedAt: new Date() }
					});
				result.redirects += 1;
			}
		} catch (err) {
			result.skipped += 1;
			result.errors.push({ row: 0, handle: planned.handle, reason: String(err) });
		}
	}

	await audit({
		actorType: 'admin',
		action: 'catalog.import',
		entity: 'product',
		meta: { source: opts.source, created: result.created, updated: result.updated, errors: result.errors.length }
	});

	return result;
}

export function analyse(csv: string): { sheet: Sheet; preset: Preset | null } {
	const sheet = toSheet(csv);
	return { sheet, preset: detectPreset(sheet.headers) };
}

export { PRESETS };
