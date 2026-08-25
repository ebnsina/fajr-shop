import { error } from '@sveltejs/kit';
import { categoryBySlug, browse, facetsFor, type Sort } from '@fajr/core/catalog';
import type { PageServerLoad } from './$types';
import { titled } from '$lib/meta';

const SORTS = new Set<Sort>(['newest', 'price-asc', 'price-desc']);

export const load: PageServerLoad = async ({ params, url, parent }) => {
	const { store } = await parent();
	const category = await categoryBySlug(params.slug);
	if (!category) error(404, 'Category not found');

	const sortParam = url.searchParams.get('sort') as Sort | null;
	const sort = sortParam && SORTS.has(sortParam) ? sortParam : 'newest';
	const inStockOnly = url.searchParams.get('stock') === '1';

	/** f.<attributeId>=a,b — selections live in the URL so a filtered view is shareable. */
	const selected: Record<string, string[]> = {};
	for (const [key, value] of url.searchParams) {
		if (!key.startsWith('f.')) continue;
		selected[key.slice(2)] = value.split(',').filter(Boolean);
	}

	const [result, facets] = await Promise.all([
		browse({
			categoryId: category.id,
			sort,
			inStockOnly,
			facets: selected,
			page: Number(url.searchParams.get('page') ?? 1)
		}),
		facetsFor(category.id)
	]);

	return {
		category,
		sort,
		inStockOnly,
		facets,
		selected,
		...result,
		meta: {
			title: titled(store.name, category.metaTitle ?? category.name),
			description: category.metaDescription ?? undefined
		}
	};
};
