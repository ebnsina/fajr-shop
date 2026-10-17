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
};

const taka = (v: string | null) => {
	const n = Number(v);
	return v && Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : undefined;
};

/** One page of products for the address's filters; scope adds the category or search words. */
export async function listing(
	api: Client<paths>,
	url: URL,
	scope: { category?: string; q?: string } = {}
): Promise<{ page: components['schemas']['ProductPage']; filters: Filters; paged: boolean }> {
	const p = url.searchParams;
	const sort = (sorts as readonly string[]).includes(p.get('sort') ?? '')
		? (p.get('sort') as NonNullable<Sort>)
		: 'newest';
	const cursor = p.get('cursor') ?? undefined;
	const {
		data,
		error: err,
		response
	} = await api.GET('/v1/products', {
		params: {
			query: {
				...scope,
				min_price: taka(p.get('min')),
				max_price: taka(p.get('max')),
				in_stock: p.get('stock') === '1' || undefined,
				sort,
				cursor,
				limit: 24
			}
		}
	});
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
		filters: {
			min: p.get('min') ?? '',
			max: p.get('max') ?? '',
			stock: p.get('stock') === '1',
			sort,
			q: scope.q ?? ''
		},
		paged: !!cursor
	};
}
