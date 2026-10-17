import { listing } from '#lib/server/listing.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const q = url.searchParams.get('q')?.trim().slice(0, 100) ?? '';
	return {
		q,
		...(q
			? await listing(locals.api, url, { q })
			: { page: null, facets: null, filters: null, paged: false })
	};
};
