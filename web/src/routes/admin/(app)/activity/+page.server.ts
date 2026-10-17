import { error } from '@sveltejs/kit';
import { errorText } from '#lib/copy.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const cursor = url.searchParams.get('cursor') ?? undefined;
	const {
		data,
		error: err,
		response
	} = await locals.api.GET('/v1/admin/audit-log', {
		params: { query: { cursor, limit: 50 } }
	});
	if (!data) error(response.status, errorText(err?.error.code));
	return { page: data, older: !!cursor };
};
