import { error } from '@sveltejs/kit';
import type { components } from '#lib/api.js';
import { errorText } from '#lib/copy.js';
import type { PageServerLoad } from './$types';

type Status = components['schemas']['OrderStatus'];
const statuses: Status[] = ['pending', 'confirmed', 'packed', 'shipped', 'delivered', 'cancelled'];

// ?status= filters; ?cursor= is the next page of older orders.
export const load: PageServerLoad = async ({ locals, url }) => {
	const s = url.searchParams.get('status') as Status | null;
	const status = s && statuses.includes(s) ? s : undefined;
	const cursor = url.searchParams.get('cursor') ?? undefined;
	const {
		data,
		error: err,
		response
	} = await locals.api.GET('/v1/admin/orders', {
		params: { query: { status, cursor, limit: 50 } }
	});
	if (!data) error(response.status, errorText(err?.error.code));
	return { orders: data.items, next: data.next_cursor ?? null, status: status ?? null, statuses };
};
