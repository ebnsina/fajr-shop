import { listOrders } from '@fajr/core/orders';
import { listProducts } from '@fajr/core/catalog';
import { salesSummary, codPerformance, courierPerformance } from '@fajr/core/reports';
import { unreadTotal } from '@fajr/core/chat';
import { pendingReviews } from '@fajr/core/social';
import { requirePermission } from '$lib/server/guard';

import type { PageServerLoad } from './$types';

const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000);

export const load: PageServerLoad = async ({ locals }) => {
	requirePermission(locals, 'order.read');

	const now = new Date();
	const last30 = { from: daysAgo(30), to: now };
	// The comparison window, so a number can say whether it is going the right way.
	const previous30 = { from: daysAgo(60), to: daysAgo(30) };

	const [toCall, toShip, products, recent, sales, before, cod, couriers, unread, reviews] =
		await Promise.all([
			listOrders({ verificationStatus: 'pending', limit: 1 }),
			listOrders({ status: 'confirmed', limit: 1 }),
			listProducts({ limit: 200 }),
			listOrders({ limit: 6 }),
			salesSummary(last30),
			salesSummary(previous30),
			codPerformance(last30),
			courierPerformance(last30),
			unreadTotal(),
			pendingReviews()
		]);

	const lowStock = products.rows.filter((r) => Number(r.stock) <= 3);

	// byDay only returns days that had sales. A sparkline needs the quiet days
	// too, or a good month with one big day draws as a flat line.
	const byDate = new Map(sales.byDay.map((d) => [d.day, d.revenueMinor]));
	const series = Array.from({ length: 30 }, (_, i) => {
		const day = new Date(daysAgo(29 - i)).toISOString().slice(0, 10);
		return byDate.get(day) ?? 0;
	});

	return {
		queues: {
			toCall: toCall.total,
			toShip: toShip.total,
			lowStock: lowStock.length,
			unread,
			reviews: reviews.length
		},
		sales,
		series,
		// Null rather than zero when there is no prior window: "0% change" from
		// nothing is a lie, and an empty state should say so.
		previousRevenueMinor: before.orders > 0 ? before.revenueMinor : null,
		cod,
		outstandingCodMinor: couriers.reduce((sum, c) => sum + c.outstandingCodMinor, 0),
		recent: recent.rows,
		lowStockItems: lowStock.slice(0, 5)
	};
};
