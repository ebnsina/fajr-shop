import { error, json } from '@sveltejs/kit';
import { errorText } from '#lib/copy.js';
import type { RequestHandler } from './$types';

// One product, for the quick-add window a product card opens.
export const GET: RequestHandler = async ({ locals, params }) => {
	const {
		data,
		error: err,
		response
	} = await locals.api.GET('/v1/products/{slug}', {
		params: { path: { slug: params.slug } }
	});
	if (!data) error(response.status, errorText(err?.error.code));
	return json(data, { headers: { 'cache-control': 'public, max-age=60' } });
};
