import { browse } from '@fajr/core/catalog';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const q = url.searchParams.get('q')?.trim() ?? '';
	const result = q ? await browse({ search: q, page: Number(url.searchParams.get('page') ?? 1) }) : { items: [], total: 0, page: 1, pages: 1 };
	return { q, ...result };
};
