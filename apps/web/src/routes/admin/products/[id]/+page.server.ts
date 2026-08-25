import { error, fail, redirect } from '@sveltejs/kit';
import { superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import { productForm, takaToMinor, minorToTaka } from '@fajr/schemas';
import {
	getProduct, createProduct, updateProduct, setOptions, replaceVariants,
	setProductImages, archiveProduct, categoryTree, attributesFor, specsFor,
	setProductAttributes, type CategoryNode
} from '@fajr/core/catalog';
import { list as listMedia } from '@fajr/core/media';
import { db, brand, asc } from '@fajr/db';
import { comboKey } from '$lib/variants';
import type { Actions, PageServerLoad } from './$types';

function flatten(nodes: CategoryNode[], depth = 0): { id: string; label: string }[] {
	return nodes.flatMap((n) => [
		{ id: n.id, label: `${'— '.repeat(depth)}${n.name}` },
		...flatten(n.children, depth + 1)
	]);
}

export const load: PageServerLoad = async ({ params }) => {
	const isNew = params.id === 'new';

	const [tree, brands, media] = await Promise.all([
		categoryTree(),
		db.read.select({ id: brand.id, name: brand.name }).from(brand).orderBy(asc(brand.name)),
		listMedia({ limit: 120 })
	]);

	if (isNew) {
		// errors: false — an untouched form must not open with "A product needs
		// a title" already in red. Errors appear when the merchant submits.
		const form = await superValidate(
			{ status: 'draft', variants: [{ key: '', price: 0, stockOnHand: 0, allowBackorder: false, isActive: true }] },
			zod(productForm),
			{ errors: false }
		);
		return {
			form,
			isNew,
			categories: flatten(tree),
			brands,
			media,
			images: [],
			attributes: [] as Awaited<ReturnType<typeof attributesFor>>,
			specValues: {} as Record<string, string>
		};
	}

	const existing = await getProduct(params.id);
	if (!existing) error(404, 'Product not found');

	// Only categories with attributes produce a spec editor, so a fashion
	// product never sees one.
	const attributes = existing.categoryId ? await attributesFor(existing.categoryId) : [];
	const specs = await specsFor(existing.id);
	const specValues: Record<string, string> = Object.fromEntries(
		attributes.map((a) => [a.id, specs.find((s) => s.name === a.name)?.value ?? ''])
	);

	// Rebuild each variant's option key so the matrix can match rows on reload.
	const valueById = new Map(
		existing.options.flatMap((o) => o.values.map((v) => [v.id, v.value] as const))
	);

	const form = await superValidate(
		{
			title: existing.title,
			slug: existing.slug,
			summary: existing.summary,
			description: existing.description,
			status: existing.status,
			categoryId: existing.categoryId,
			brandId: existing.brandId,
			metaTitle: existing.metaTitle,
			metaDescription: existing.metaDescription,
			mediaIds: existing.images.map((i) => i.mediaId),
			options: existing.options.map((o) => ({
				name: o.name,
				values: o.values.map((v) => ({ value: v.value, swatchHex: v.swatchHex }))
			})),
			variants: existing.variants.map((v) => ({
				id: v.id,
				key: comboKey(v.optionValueIds.map((id) => valueById.get(id) ?? '').filter(Boolean)),
				sku: v.sku,
				price: Number(minorToTaka(v.priceMinor)),
				compareAt: v.compareAtMinor === null ? null : Number(minorToTaka(v.compareAtMinor)),
				cost: v.costMinor === null ? null : Number(minorToTaka(v.costMinor)),
				stockOnHand: v.stockOnHand,
				allowBackorder: v.allowBackorder,
				isActive: v.isActive
			}))
		},
		zod(productForm)
	);

	return {
		form,
		isNew,
		categories: flatten(tree),
		brands,
		media,
		images: existing.images,
		attributes,
		specValues
	};
};

export const actions: Actions = {
	save: async ({ request, params, locals }) => {
		// Read the body once. superValidate consumes it, and a later `request.clone()` throws — the
		// spec fields are read from this same FormData rather than a second pass.
		const raw = await request.formData();
		const form = await superValidate(raw, zod(productForm));
		if (!form.valid) return fail(400, { form });

		const data = form.data;
		const isNew = params.id === 'new';
		const id = isNew
			? await createProduct({ title: data.title, slug: data.slug || data.title }, { actorId: locals.staff?.id })
			: params.id;

		await updateProduct(
			id,
			{
				title: data.title,
				slug: data.slug || data.title,
				summary: data.summary,
				description: data.description,
				status: data.status,
				categoryId: data.categoryId || null,
				brandId: data.brandId || null,
				metaTitle: data.metaTitle,
				metaDescription: data.metaDescription
			},
			{ actorId: locals.staff?.id }
		);

		await setOptions(
			id,
			data.options
				.filter((o) => o.name.trim())
				.map((o) => ({
					name: o.name.trim(),
					values: o.values.filter((v) => v.value.trim()).map((v) => ({ value: v.value.trim(), swatchHex: v.swatchHex }))
				}))
		);

		// Re-read the option values we just wrote to map each variant's key back
		// to real option-value ids.
		const saved = await getProduct(id);
		const idByValue = new Map(saved!.options.flatMap((o) => o.values.map((v) => [v.value, v.id] as const)));

		await replaceVariants(
			id,
			data.variants.map((v) => ({
				sku: v.sku,
				priceMinor: takaToMinor(v.price),
				compareAtMinor: v.compareAt == null ? null : takaToMinor(v.compareAt),
				costMinor: v.cost == null ? null : takaToMinor(v.cost),
				stockOnHand: v.stockOnHand,
				allowBackorder: v.allowBackorder,
				isActive: v.isActive,
				optionValueIds: v.key
					? v.key.split(' / ').map((value) => idByValue.get(value)).filter((x): x is string => Boolean(x))
					: []
			}))
		);

		await setProductImages(id, data.mediaIds);

		// Specs are plain form fields rather than part of the superforms schema:
		// the field set depends on the category, which the schema cannot know.
		const specValues = [...raw.entries()]
			.filter(([k]) => k.startsWith('spec.'))
			.map(([k, v]) => ({ attributeId: k.slice(5), value: String(v) }));
		if (specValues.length) await setProductAttributes(id, specValues);

		if (isNew) redirect(303, `/admin/products/${id}`);
		return { form };
	},

	archive: async ({ params, locals }) => {
		if (params.id === 'new') return fail(400);
		await archiveProduct(params.id, { actorId: locals.staff?.id });
		redirect(303, '/admin/products');
	}
};
