import { error } from '@sveltejs/kit';
import { errorText } from '#lib/copy.js';
import type { PageServerLoad } from './$types';

// ?q= searches; ?cursor= is the next page.
export const load: PageServerLoad = async ({ locals, url }) => {
	const q = url.searchParams.get('q')?.trim().slice(0, 80) ?? '';
	const cursor = url.searchParams.get('cursor') ?? undefined;
	const {
		data,
		error: err,
		response
	} = await locals.api.GET('/v1/admin/customers', {
		params: { query: { q: q || undefined, cursor, limit: 50 } }
	});
	if (!data) error(response.status, errorText(err?.error.code));
	return { customers: data.items, next: data.next_cursor ?? null, q };
};
