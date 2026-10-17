import { error } from '@sveltejs/kit';
import { errorText } from '#lib/copy.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
	const [product, zones] = await Promise.all([
		locals.api.GET('/v1/products/{slug}', { params: { path: { slug: params.slug } } }),
		locals.api.GET('/v1/shipping/zones')
	]);
	if (!product.data) error(product.response.status, errorText(product.error?.error.code));
	return { product: product.data, zones: zones.data?.items ?? [] };
};
