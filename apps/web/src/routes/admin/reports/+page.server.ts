import { salesSummary, codPerformance, courierPerformance, topProducts, couponUsage, funnel } from '@fajr/core/reports';
import type { PageServerLoad } from './$types';

const PRESETS: Record<string, number> = { '7d': 7, '30d': 30, '90d': 90 };

export const load: PageServerLoad = async ({ url }) => {
	const key = url.searchParams.get('range') ?? '30d';
	const days = PRESETS[key] ?? 30;

	// Days are Dhaka days: a report that splits on UTC midnight cuts the
	// evening's orders into the wrong day for everyone reading it.
	const to = new Date();
	const from = new Date(to.getTime() - days * 86_400_000);
	const range = { from, to };

	const [sales, cod, couriers, products, coupons, steps] = await Promise.all([
		salesSummary(range),
		codPerformance(range),
		courierPerformance(range),
		topProducts(range, 10),
		couponUsage(range),
		funnel(range)
	]);

	return { range: key, days, sales, cod, couriers, products, coupons, funnel: steps };
};
