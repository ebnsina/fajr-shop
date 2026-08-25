import { browse } from '@fajr/core/catalog';
import type { PageServerLoad } from './$types';
import { titled } from '$lib/meta';

export const load: PageServerLoad = async ({ url, parent }) => {
	const { store } = await parent();
	const q = url.searchParams.get('q')?.trim() ?? '';
	const result = q ? await browse({ search: q, page: Number(url.searchParams.get('page') ?? 1) }) : { items: [], total: 0, page: 1, pages: 1 };
	return {
		q,
		...result,
		meta: {
			title: titled(store.name, q ? `“${q}”` : 'Search'),
			// Search results are per-query and thin; keep them out of the index.
			noindex: true
		}
	};
};
