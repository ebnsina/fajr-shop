import { error, redirect } from '@sveltejs/kit';
import type { Client } from 'openapi-fetch';
import type { components, paths } from '#lib/api.js';
import { errorText } from '#lib/copy.js';

export type Sort = NonNullable<paths['/v1/products']['get']['parameters']['query']>['sort'];
export const sorts = ['newest', 'price_asc', 'price_desc', 'name'] as const;

/** Filters as typed in the address: prices in taka, so a shared link reads naturally. */
export type Filters = {
	min: string;
	max: string;
	stock: boolean;
	sort: NonNullable<Sort>;
	q: string;
	sale: boolean;
	featured: boolean;
	category: string;
	brands: string[];
	/** `Name:Value` pairs, as the API takes them. */
	options: string[];
};

export type Facets = components['schemas']['Facets'];

const taka = (v: string | null) => {
	const n = Number(v);
	return v && Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : undefined;
};

/** One page of products for the address's filters; scope adds the category or search words. */
export async function listing(
	api: Client<paths>,
	url: URL,
	scope: { category?: string; q?: string } = {}
): Promise<{
	page: components['schemas']['ProductPage'];
	facets: Facets | null;
	filters: Filters;
	paged: boolean;
}> {
	const p = url.searchParams;
	const sort = (sorts as readonly string[]).includes(p.get('sort') ?? '')
		? (p.get('sort') as NonNullable<Sort>)
		: 'newest';
	const cursor = p.get('cursor') ?? undefined;
	// A category page fixes its category; elsewhere it's one more filter in the address.
	const category = scope.category ?? (p.get('category') || undefined);
	const brands = p.getAll('brand').filter(Boolean).slice(0, 30);
	const options = p
		.getAll('option')
		.filter((o) => o.includes(':'))
		.slice(0, 30);
	const query = {
		q: scope.q,
		category,
		brand: brands.length ? brands : undefined,
		option: options.length ? options : undefined,
		min_price: taka(p.get('min')),
		max_price: taka(p.get('max')),
		in_stock: p.get('stock') === '1' || undefined,
		on_sale: p.get('sale') === '1' || undefined,
		featured: p.get('featured') === '1' || undefined
	};
	const [{ data, error: err, response }, facets] = await Promise.all([
		api.GET('/v1/products', { params: { query: { ...query, sort, cursor, limit: 24 } } }),
		api.GET('/v1/products/facets', { params: { query } })
	]);
	if (!data) {
		// An old "more products" link: start the same list again from the top.
		if (cursor && err?.error.fields?.cursor) {
			const fresh = new URL(url);
			fresh.searchParams.delete('cursor');
			redirect(303, fresh.pathname + fresh.search);
		}
		error(response.status, errorText(err?.error.code));
	}
	return {
		page: data,
		// Without facets the list still works; the side card just shows fewer choices.
		facets: facets.data ?? null,
		filters: {
			min: p.get('min') ?? '',
			max: p.get('max') ?? '',
			stock: p.get('stock') === '1',
			sort,
			q: scope.q ?? '',
			sale: p.get('sale') === '1',
			featured: p.get('featured') === '1',
			category: scope.category ? '' : (category ?? ''),
			brands,
			options
		},
		paged: !!cursor
	};
}
