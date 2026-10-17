import { error } from '@sveltejs/kit';
import { errorText } from '#lib/copy.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
	const [product, zones] = await Promise.all([
		locals.api.GET('/v1/products/{slug}', { params: { path: { slug: params.slug } } }),
		locals.api.GET('/v1/shipping/zones')
	]);
	if (!product.data) error(product.response.status, errorText(product.error?.error.code));
	// Others from the same category; the page still works if this list can't be had.
	const cat = product.data.category?.slug;
	const similar = cat
		? await locals.api.GET('/v1/products', { params: { query: { category: cat, limit: 6 } } })
		: null;
	return {
		product: product.data,
		zones: zones.data?.items ?? [],
		similar: (similar?.data?.items ?? []).filter((x) => x.id !== product.data.id).slice(0, 5)
	};
};
