import { error } from '@sveltejs/kit';
import { errorText } from '#lib/copy.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
	const {
		data,
		error: err,
		response
	} = await locals.api.GET('/v1/products/{slug}', {
		params: { path: { slug: params.slug } }
	});
	if (!data) error(response.status, errorText(err?.error.code));
	return { product: data };
};
