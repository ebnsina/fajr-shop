import { listOrders } from '@fajr/core/orders';
import { ORDER_VIEWS } from '$lib/orderViews';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const key = url.searchParams.get('view') ?? 'all';
	const active = ORDER_VIEWS.find((v) => v.key === key) ?? ORDER_VIEWS[0];
	const search = url.searchParams.get('q') ?? '';
	const page = Math.max(1, Number(url.searchParams.get('page') ?? 1));
	const perPage = 30;

	const { rows, total } = await listOrders({
		...active.filter,
		search,
		limit: perPage,
		offset: (page - 1) * perPage
	});

	// Counts on the tabs, so staff can see the queue without clicking into it.
	const counts = Object.fromEntries(
		await Promise.all(
			ORDER_VIEWS.map(async (v) => [v.key, (await listOrders({ ...v.filter, limit: 1 })).total] as const)
		)
	);

	return { rows, total, page, perPage, search, view: active.key, views: ORDER_VIEWS, counts };
};
