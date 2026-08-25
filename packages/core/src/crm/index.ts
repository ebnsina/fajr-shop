import { db, customer, order, orderItem, newId, eq, sql, desc } from '@fajr/db';
import { segmentOf, type Segment, type Scored } from './segments.ts';
import { audit } from '../audit/index.ts';

export * from './segments.ts';

export type CustomerRow = {
	phoneE164: string;
	name: string | null;
	orders: number;
	delivered: number;
	returned: number;
	lifetimeMinor: number;
	lastOrderAt: Date;
	firstOrderAt: Date;
	recencyDays: number;
	isBlacklisted: boolean;
	note: string | null;
} & Scored;

// The customer list is built from orders keyed by phone, not from a customer table.
const AGGREGATE = sql`
	select
		o.phone_e164                                                          as phone,
		max(a.name)                                                           as name,
		count(*)                                                              as orders,
		count(*) filter (where o.status = 'delivered')                        as delivered,
		count(*) filter (where o.status in ('returned', 'cancelled'))         as returned,
		coalesce(sum(o.total_minor) filter (where o.status <> 'cancelled'), 0) as lifetime,
		max(o.placed_at)                                                      as last_order,
		min(o.placed_at)                                                      as first_order
	from "order" o
	left join address a on a.id = o.shipping_address_id
	group by o.phone_e164
`;

type Row = {
	phone: string;
	name: string | null;
	orders: number | string;
	delivered: number | string;
	returned: number | string;
	lifetime: number | string;
	last_order: Date;
	first_order: Date;
};

function hydrate(r: Row, flags: Map<string, { isBlacklisted: boolean; note: string | null }>): CustomerRow {
	const recencyDays = Math.floor((Date.now() - new Date(r.last_order).getTime()) / 86_400_000);
	const delivered = Number(r.delivered);
	const returned = Number(r.returned);

	const scored = segmentOf(
		{ recencyDays, frequency: Number(r.orders), monetaryMinor: Number(r.lifetime) },
		{ delivered, returned }
	);

	const flag = flags.get(r.phone);

	return {
		phoneE164: r.phone,
		name: r.name,
		orders: Number(r.orders),
		delivered,
		returned,
		lifetimeMinor: Number(r.lifetime),
		lastOrderAt: new Date(r.last_order),
		firstOrderAt: new Date(r.first_order),
		recencyDays,
		isBlacklisted: flag?.isBlacklisted ?? false,
		note: flag?.note ?? null,
		...scored
	};
}

async function flagMap(phones: string[]) {
	if (!phones.length) return new Map<string, { isBlacklisted: boolean; note: string | null }>();
	const rows = (await db.read.execute(sql`
		select phone_e164, is_blacklisted, note from customer
		where phone_e164 in ${sql`(${sql.join(phones.map((p) => sql`${p}`), sql`, `)})`}
	`)) as unknown as { phone_e164: string; is_blacklisted: boolean; note: string | null }[];
	return new Map(rows.map((r) => [r.phone_e164, { isBlacklisted: r.is_blacklisted, note: r.note }]));
}

export type CustomerFilter = { search?: string; segment?: Segment; limit?: number; offset?: number };

export async function listCustomers(filter: CustomerFilter = {}) {
	const limit = Math.min(filter.limit ?? 50, 200);
	const search = filter.search?.trim();

	const rows = (await db.read.execute(sql`
		select * from (${AGGREGATE}) c
		${search ? sql`where c.phone like ${'%' + search + '%'} or c.name ilike ${'%' + search + '%'}` : sql``}
		order by c.last_order desc
		limit ${limit} offset ${filter.offset ?? 0}
	`)) as unknown as Row[];

	const flags = await flagMap(rows.map((r) => r.phone));
	const hydrated = rows.map((r) => hydrate(r, flags));

	// Segments are derived, so they filter after hydration rather than in SQL.
	return filter.segment ? hydrated.filter((c) => c.segment === filter.segment) : hydrated;
}

export async function customerProfile(phoneE164: string) {
	const rows = (await db.read.execute(sql`
		select * from (${AGGREGATE}) c where c.phone = ${phoneE164}
	`)) as unknown as Row[];
	if (!rows.length) return null;

	const flags = await flagMap([phoneE164]);
	const profile = hydrate(rows[0]!, flags);

	// A join and a group-by, not a correlated subquery: drizzle renders an
	// interpolated column as a bare name, which binds to the wrong table.
	const history = await db.read
		.select({
			id: order.id,
			publicCode: order.publicCode,
			status: order.status,
			totalMinor: order.totalMinor,
			placedAt: order.placedAt,
			itemCount: sql<number>`coalesce(sum(${orderItem.qty}), 0)`
		})
		.from(order)
		.leftJoin(orderItem, eq(orderItem.orderId, order.id))
		.where(eq(order.phoneE164, phoneE164))
		.groupBy(order.id)
		.orderBy(desc(order.placedAt))
		.limit(50);

	return { ...profile, history };
}

/** Counts per segment, for the tabs on the customer list. */
export async function segmentCounts(): Promise<Record<Segment, number>> {
	const rows = (await db.read.execute(sql`select * from (${AGGREGATE}) c`)) as unknown as Row[];
	const flags = await flagMap(rows.map((r) => r.phone));

	const counts = {
		champion: 0, loyal: 0, promising: 0, new: 0, at_risk: 0, lost: 0, problem: 0
	} as Record<Segment, number>;

	for (const row of rows) counts[hydrate(row, flags).segment] += 1;
	return counts;
}

// Blacklisting is stored on the customer row, creating it if this buyer has only ever been a
// phone number on an order.
export async function setBlacklisted(phoneE164: string, isBlacklisted: boolean, note?: string | null) {
	await db.write
		.insert(customer)
		.values({ id: newId('cus'), phoneE164, isBlacklisted, note: note ?? null })
		.onConflictDoUpdate({
			target: customer.phoneE164,
			set: { isBlacklisted, ...(note !== undefined ? { note } : {}), updatedAt: new Date() }
		});

	await audit({
		actorType: 'admin',
		action: isBlacklisted ? 'customer.blacklist' : 'customer.unblacklist',
		entity: 'customer',
		entityId: phoneE164,
		meta: { note }
	});
}

export async function isBlacklisted(phoneE164: string): Promise<boolean> {
	const row = await db.read.query.customer.findFirst({ where: eq(customer.phoneE164, phoneE164) });
	return row?.isBlacklisted ?? false;
}

export async function setNote(phoneE164: string, note: string | null) {
	await db.write
		.insert(customer)
		.values({ id: newId('cus'), phoneE164, note })
		.onConflictDoUpdate({ target: customer.phoneE164, set: { note, updatedAt: new Date() } });
}
