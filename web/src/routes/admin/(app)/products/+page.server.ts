import { error } from '@sveltejs/kit';
import { errorText } from '#lib/copy.js';
import type { components } from '#lib/api.js';
import type { PageServerLoad } from './$types';

type Status = components['schemas']['ProductStatus'];

export const load: PageServerLoad = async ({ locals, url }) => {
	const q = url.searchParams.get('q')?.trim() || undefined;
	const status = (url.searchParams.get('status') || undefined) as Status | undefined;
	const cursor = url.searchParams.get('cursor') ?? undefined;
	const {
		data,
		error: err,
		response
	} = await locals.api.GET('/v1/admin/products', {
		params: { query: { q, status, cursor, limit: 25 } }
	});
	if (!data) error(response.status, errorText(err?.error.code));
	return { page: data, q: q ?? '', status: status ?? '', paged: !!cursor };
};
