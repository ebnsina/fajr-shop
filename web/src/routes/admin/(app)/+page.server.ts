import { error } from '@sveltejs/kit';
import { errorText } from '#lib/copy.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const [overview, activity, orders] = await Promise.all([
		locals.api.GET('/v1/admin/overview'),
		locals.api.GET('/v1/admin/audit-log', { params: { query: { limit: 8 } } }),
		locals.api.GET('/v1/admin/orders', { params: { query: { limit: 6 } } })
	]);
	if (!overview.data) error(overview.response.status, errorText(overview.error?.error.code));
	// Whoever may not read the log or the orders gets an overview without that panel.
	return {
		overview: overview.data,
		activity: activity.data?.items ?? null,
		orders: orders.data?.items ?? null
	};
};
