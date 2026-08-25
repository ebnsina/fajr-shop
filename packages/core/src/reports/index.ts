import { db, sql } from '@fajr/db';

export type Range = { from: Date; to: Date };

// Every report answers one operational question, and every one of them excludes cancelled
// orders from revenue.

const bounds = (r: Range) => ({ from: r.from.toISOString(), to: r.to.toISOString() });

export type SalesSummary = {
	orders: number;
	revenueMinor: number;
	itemsSold: number;
	averageOrderMinor: number;
	cancelled: number;
	byDay: { day: string; orders: number; revenueMinor: number }[];
};

export async function salesSummary(range: Range): Promise<SalesSummary> {
	const { from, to } = bounds(range);

	const [totals] = (await db.read.execute(sql`
		select
			count(*) filter (where status <> 'cancelled')                        as orders,
			coalesce(sum(total_minor) filter (where status <> 'cancelled'), 0)   as revenue,
			count(*) filter (where status = 'cancelled')                         as cancelled
		from "order"
		where placed_at >= ${from}::timestamptz and placed_at < ${to}::timestamptz
	`)) as unknown as { orders: number | string; revenue: number | string; cancelled: number | string }[];

	const [items] = (await db.read.execute(sql`
		select coalesce(sum(oi.qty), 0) as items
		from order_item oi
		join "order" o on o.id = oi.order_id
		where o.placed_at >= ${from}::timestamptz and o.placed_at < ${to}::timestamptz
		  and o.status <> 'cancelled'
	`)) as unknown as { items: number | string }[];

	const byDay = (await db.read.execute(sql`
		select
			to_char(date_trunc('day', placed_at at time zone 'Asia/Dhaka'), 'YYYY-MM-DD') as day,
			count(*)                                                                       as orders,
			coalesce(sum(total_minor), 0)                                                  as revenue
		from "order"
		where placed_at >= ${from}::timestamptz and placed_at < ${to}::timestamptz
		  and status <> 'cancelled'
		group by 1
		order by 1
	`)) as unknown as { day: string; orders: number | string; revenue: number | string }[];

	const orders = Number(totals?.orders ?? 0);
	const revenueMinor = Number(totals?.revenue ?? 0);

	return {
		orders,
		revenueMinor,
		itemsSold: Number(items?.items ?? 0),
		// Integer division: an average in poisha, never a float.
		averageOrderMinor: orders > 0 ? Math.round(revenueMinor / orders) : 0,
		cancelled: Number(totals?.cancelled ?? 0),
		byDay: byDay.map((d) => ({ day: d.day, orders: Number(d.orders), revenueMinor: Number(d.revenue) }))
	};
}

export type CodPerformance = {
	placed: number;
	confirmed: number;
	delivered: number;
	returned: number;
	cancelled: number;
	/** Of the orders that reached a courier, how many stuck. */
	deliveryRate: number;
	returnRate: number;
	/** How many survived the verification call. */
	confirmationRate: number;
	lostToReturnsMinor: number;
};

// The number that decides whether a BD shop makes money. Return rates run 20–35% here, and a
// shop that cannot see its own rate cannot improve it.
export async function codPerformance(range: Range): Promise<CodPerformance> {
	const { from, to } = bounds(range);

	const [row] = (await db.read.execute(sql`
		select
			count(*)                                                          as placed,
			count(*) filter (where verification_status = 'confirmed')         as confirmed,
			count(*) filter (where status = 'delivered')                      as delivered,
			count(*) filter (where status = 'returned')                       as returned,
			count(*) filter (where status = 'cancelled')                      as cancelled,
			coalesce(sum(total_minor) filter (where status = 'returned'), 0)  as lost
		from "order"
		where placed_at >= ${from}::timestamptz and placed_at < ${to}::timestamptz
		  and payment_method = 'cod'
	`)) as unknown as Record<string, number | string>[];

	const placed = Number(row?.placed ?? 0);
	const delivered = Number(row?.delivered ?? 0);
	const returned = Number(row?.returned ?? 0);

	// Only parcels that actually reached a courier count toward delivery rate;
	// an order cancelled on the phone was never a delivery attempt.
	const attempted = delivered + returned;

	return {
		placed,
		confirmed: Number(row?.confirmed ?? 0),
		delivered,
		returned,
		cancelled: Number(row?.cancelled ?? 0),
		deliveryRate: attempted > 0 ? delivered / attempted : 0,
		returnRate: attempted > 0 ? returned / attempted : 0,
		confirmationRate: placed > 0 ? Number(row?.confirmed ?? 0) / placed : 0,
		lostToReturnsMinor: Number(row?.lost ?? 0)
	};
}

export type CourierRow = {
	courier: string;
	shipped: number;
	delivered: number;
	returned: number;
	deliveryRate: number;
	/** Median is used, not mean: one parcel lost for a month skews an average. */
	medianDays: number | null;
	outstandingCodMinor: number;
};

export async function courierPerformance(range: Range): Promise<CourierRow[]> {
	const { from, to } = bounds(range);

	const rows = (await db.read.execute(sql`
		select
			courier,
			count(*)                                                     as shipped,
			count(*) filter (where status = 'delivered')                 as delivered,
			count(*) filter (where status in ('returned','lost'))        as returned,
			percentile_cont(0.5) within group (
				order by extract(epoch from (delivered_at - pushed_at)) / 86400
			) filter (where delivered_at is not null)                    as median_days,
			coalesce(sum(cod_amount_minor) filter (
				where status = 'delivered' and cod_settled_at is null
			), 0)                                                        as outstanding
		from shipment
		where created_at >= ${from}::timestamptz and created_at < ${to}::timestamptz
		group by courier
		order by count(*) desc
	`)) as unknown as Record<string, string | number | null>[];

	return rows.map((r) => {
		const delivered = Number(r.delivered);
		const returned = Number(r.returned);
		const attempted = delivered + returned;
		return {
			courier: String(r.courier),
			shipped: Number(r.shipped),
			delivered,
			returned,
			deliveryRate: attempted > 0 ? delivered / attempted : 0,
			medianDays: r.median_days === null ? null : Math.round(Number(r.median_days) * 10) / 10,
			outstandingCodMinor: Number(r.outstanding)
		};
	});
}

export type ProductRow = {
	productId: string | null;
	title: string;
	qty: number;
	revenueMinor: number;
	/** Null when cost was never recorded — better than pretending margin is 100%. */
	marginMinor: number | null;
};

export async function topProducts(range: Range, limit = 20): Promise<ProductRow[]> {
	const { from, to } = bounds(range);

	const rows = (await db.read.execute(sql`
		select
			oi.product_id,
			max(oi.title)                as title,
			sum(oi.qty)                  as qty,
			sum(oi.total_minor)          as revenue,
			-- Null if any line is missing a cost, so a partial margin never
			-- masquerades as the real one.
			case when bool_and(oi.unit_cost_minor is not null)
			     then sum(oi.total_minor - oi.unit_cost_minor * oi.qty)
			     else null end           as margin
		from order_item oi
		join "order" o on o.id = oi.order_id
		where o.placed_at >= ${from}::timestamptz and o.placed_at < ${to}::timestamptz
		  and o.status <> 'cancelled'
		group by oi.product_id
		order by sum(oi.qty) desc
		limit ${limit}
	`)) as unknown as Record<string, string | number | null>[];

	return rows.map((r) => ({
		productId: r.product_id === null ? null : String(r.product_id),
		title: String(r.title),
		qty: Number(r.qty),
		revenueMinor: Number(r.revenue),
		marginMinor: r.margin === null ? null : Number(r.margin)
	}));
}

export type CouponRow = {
	code: string;
	uses: number;
	discountMinor: number;
	revenueMinor: number;
};

export async function couponUsage(range: Range): Promise<CouponRow[]> {
	const { from, to } = bounds(range);

	const rows = (await db.read.execute(sql`
		select
			o.coupon_code                 as code,
			count(*)                      as uses,
			coalesce(sum(o.discount_minor), 0) as discount,
			coalesce(sum(o.total_minor), 0)    as revenue
		from "order" o
		where o.placed_at >= ${from}::timestamptz and o.placed_at < ${to}::timestamptz
		  and o.coupon_code is not null
		  and o.status <> 'cancelled'
		group by o.coupon_code
		order by count(*) desc
	`)) as unknown as Record<string, string | number>[];

	return rows.map((r) => ({
		code: String(r.code),
		uses: Number(r.uses),
		discountMinor: Number(r.discount),
		revenueMinor: Number(r.revenue)
	}));
}

export type Funnel = {
	cartsCreated: number;
	cartsWithItems: number;
	reachedCheckout: number;
	ordered: number;
	/** Of carts that got something in them, how many became orders. */
	conversionRate: number;
};

// A funnel from carts, not from pageviews. Pageview analytics belongs in a analytics tool; what
// the shop owns is what happened in its own database.
export async function funnel(range: Range): Promise<Funnel> {
	const { from, to } = bounds(range);

	const [row] = (await db.read.execute(sql`
		select
			count(*)                                                as carts,
			-- An ordered cart had items by definition, even if the rows are gone
			-- (a deleted product cascades its cart lines away). Without this the
			-- denominator can fall below the numerator and the rate goes above 1.
			count(*) filter (where items > 0 or status = 'ordered')  as with_items,
			-- Reserving stock is what checkout does, so it marks arrival there.
			count(*) filter (where reserved_until is not null
			               or status = 'ordered')                   as reached_checkout,
			count(*) filter (where status = 'ordered')              as ordered
		from (
			select c.id, c.status, c.reserved_until,
			       (select count(*) from cart_item ci where ci.cart_id = c.id) as items
			from cart c
			where c.created_at >= ${from}::timestamptz and c.created_at < ${to}::timestamptz
		) t
	`)) as unknown as Record<string, string | number>[];

	const withItems = Number(row?.with_items ?? 0);
	const ordered = Number(row?.ordered ?? 0);

	return {
		cartsCreated: Number(row?.carts ?? 0),
		cartsWithItems: withItems,
		reachedCheckout: Number(row?.reached_checkout ?? 0),
		ordered,
		conversionRate: withItems > 0 ? ordered / withItems : 0
	};
}
