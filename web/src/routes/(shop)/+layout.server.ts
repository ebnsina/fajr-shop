import { error } from '@sveltejs/kit';
import { errorText } from '#lib/copy.js';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals, setHeaders }) => {
	const { data, error: err, response } = await locals.api.GET('/v1/categories');
	if (!data) error(response.status, errorText(err?.error.code));
	// Shop pages hold nothing personal yet, so shared caches may keep them briefly.
	setHeaders({ 'cache-control': 'public, max-age=60, stale-while-revalidate=300' });
	return { categories: data.items };
};
