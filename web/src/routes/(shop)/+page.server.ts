import { error } from '@sveltejs/kit';
import { errorText } from '#lib/copy.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const {
		data,
		error: err,
		response
	} = await locals.api.GET('/v1/products', {
		params: { query: { sort: 'newest', limit: 8 } }
	});
	if (!data) error(response.status, errorText(err?.error.code));
	return { newest: data.items };
};
