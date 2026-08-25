import { listOrders } from '@fajr/core/orders';
import { listProducts } from '@fajr/core/catalog';
import { db, order, sql } from '@fajr/db';
import type { PageServerLoad } from './$types';
import { requirePermission } from '$lib/server/guard';

export const load: PageServerLoad = async ({ locals }) => {
	requirePermission(locals, 'order.read');
	const [toCall, toShip, lowStock, recent, revenue] = await Promise.all([
		listOrders({ verificationStatus: 'pending', limit: 1 }),
		listOrders({ status: 'confirmed', limit: 1 }),
		listProducts({ limit: 200 }),
		listOrders({ limit: 6 }),
		// Cancelled orders are not revenue; counting them is how a dashboard lies.
		db.read
			.select({
				orders: sql<number>`count(*)`,
				grossMinor: sql<number>`coalesce(sum(${order.totalMinor}), 0)`
			})
			.from(order)
			// The window is computed in SQL: a JS Date interpolated into a raw template is not.
			.where(sql`${order.placedAt} >= now() - interval '30 days' and ${order.status} <> 'cancelled'`)
	]);

	return {
		toCall: toCall.total,
		toShip: toShip.total,
		lowStock: lowStock.rows.filter((r) => Number(r.stock) <= 3).length,
		recent: recent.rows,
		revenue: {
			orders: Number(revenue[0]?.orders ?? 0),
			grossMinor: Number(revenue[0]?.grossMinor ?? 0)
		}
	};
};
