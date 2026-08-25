import { db, coupon, couponRedemption, newId, eq, and, sql } from '@fajr/db';
import { audit } from '../audit/index.ts';

export type CouponRule = typeof coupon.$inferSelect;

export type Quote = {
	code: string;
	type: CouponRule['type'];
	discountMinor: number;
	/** Free-shipping coupons zero the delivery charge instead of the subtotal. */
	freeShipping: boolean;
	description: string | null;
};

export type ApplyFailure =
	| 'not_found'
	| 'inactive'
	| 'not_started'
	| 'expired'
	| 'used_up'
	| 'already_used'
	| 'below_minimum';

export type ApplyResult = { ok: true; quote: Quote } | { ok: false; reason: ApplyFailure; minSubtotalMinor?: number };

const normalise = (code: string) => code.trim().toUpperCase();

// Evaluate a code against a cart. Read-only: nothing is consumed until the order is actually
// placed, so a customer can try a code, change their mind and come back without burning a use.
export async function evaluate(
	code: string,
	input: { subtotalMinor: number; shippingMinor: number; phoneE164?: string | null }
): Promise<ApplyResult> {
	const row = await db.read.query.coupon.findFirst({ where: eq(coupon.code, normalise(code)) });
	if (!row) return { ok: false, reason: 'not_found' };
	if (!row.isActive) return { ok: false, reason: 'inactive' };

	const now = new Date();
	if (row.startsAt && row.startsAt > now) return { ok: false, reason: 'not_started' };
	if (row.endsAt && row.endsAt < now) return { ok: false, reason: 'expired' };

	if (row.usageLimit !== null && row.usageCount >= row.usageLimit) {
		return { ok: false, reason: 'used_up' };
	}

	if (input.subtotalMinor < row.minSubtotalMinor) {
		return { ok: false, reason: 'below_minimum', minSubtotalMinor: row.minSubtotalMinor };
	}

	if (input.phoneE164 && row.perCustomerLimit > 0) {
		const [used] = await db.read
			.select({ n: sql<number>`count(*)` })
			.from(couponRedemption)
			.where(
				and(eq(couponRedemption.couponId, row.id), eq(couponRedemption.phoneE164, input.phoneE164))
			);
		if (Number(used?.n ?? 0) >= row.perCustomerLimit) return { ok: false, reason: 'already_used' };
	}

	return { ok: true, quote: quoteFor(row, input.subtotalMinor, input.shippingMinor) };
}

export function quoteFor(row: CouponRule, subtotalMinor: number, shippingMinor: number): Quote {
	let discountMinor = 0;
	let freeShipping = false;

	if (row.type === 'percent') {
		// Basis points, integer maths. A float here would round money wrong.
		discountMinor = Math.floor((subtotalMinor * row.value) / 10_000);
		if (row.maxDiscountMinor !== null) discountMinor = Math.min(discountMinor, row.maxDiscountMinor);
	} else if (row.type === 'fixed') {
		discountMinor = row.value;
	} else {
		freeShipping = true;
		discountMinor = shippingMinor;
	}

	// A discount can never exceed what it applies to, or the order goes negative.
	const ceiling = row.type === 'free_shipping' ? shippingMinor : subtotalMinor;
	discountMinor = Math.max(0, Math.min(discountMinor, ceiling));

	return { code: row.code, type: row.type, discountMinor, freeShipping, description: row.description };
}

// Consume a use, inside the order transaction.
type Tx = Parameters<Parameters<typeof db.tx>[0]>[0];

export async function redeem(
	tx: Tx,
	input: { code: string; orderId: string; phoneE164: string; amountMinor: number }
): Promise<boolean> {
	const claimed = await tx
		.update(coupon)
		.set({ usageCount: sql`${coupon.usageCount} + 1` })
		.where(
			and(
				eq(coupon.code, normalise(input.code)),
				eq(coupon.isActive, true),
				sql`(${coupon.usageLimit} is null or ${coupon.usageCount} < ${coupon.usageLimit})`
			)
		)
		.returning({ id: coupon.id });

	if (!claimed.length) return false;

	await tx
		.insert(couponRedemption)
		.values({
			id: newId('crd'),
			couponId: claimed[0]!.id,
			orderId: input.orderId,
			phoneE164: input.phoneE164,
			amountMinor: input.amountMinor
		})
		.onConflictDoNothing({ target: [couponRedemption.couponId, couponRedemption.orderId] });

	return true;
}

/** Cancelling an order hands the use back, like it hands the stock back. */
export async function release(orderId: string): Promise<void> {
	const rows = await db.read
		.select({ id: couponRedemption.id, couponId: couponRedemption.couponId })
		.from(couponRedemption)
		.where(eq(couponRedemption.orderId, orderId));

	for (const row of rows) {
		await db.write
			.update(coupon)
			.set({ usageCount: sql`greatest(0, ${coupon.usageCount} - 1)` })
			.where(eq(coupon.id, row.couponId));
		await db.write.delete(couponRedemption).where(eq(couponRedemption.id, row.id));
	}
}

export async function createCoupon(input: {
	code: string;
	type: CouponRule['type'];
	value: number;
	minSubtotalMinor?: number;
	maxDiscountMinor?: number | null;
	usageLimit?: number | null;
	perCustomerLimit?: number;
	startsAt?: Date | null;
	endsAt?: Date | null;
	description?: string | null;
}): Promise<string> {
	const id = newId('cpn');
	await db.write.insert(coupon).values({
		id,
		code: normalise(input.code),
		type: input.type,
		value: input.value,
		minSubtotalMinor: input.minSubtotalMinor ?? 0,
		maxDiscountMinor: input.maxDiscountMinor ?? null,
		usageLimit: input.usageLimit ?? null,
		perCustomerLimit: input.perCustomerLimit ?? 1,
		startsAt: input.startsAt ?? null,
		endsAt: input.endsAt ?? null,
		description: input.description ?? null
	});
	await audit({ actorType: 'admin', action: 'coupon.create', entity: 'coupon', entityId: id, meta: { code: input.code } });
	return id;
}

export const listCoupons = () => db.read.select().from(coupon).orderBy(sql`${coupon.createdAt} desc`);

export const setCouponActive = (id: string, isActive: boolean) =>
	db.write.update(coupon).set({ isActive, updatedAt: new Date() }).where(eq(coupon.id, id));
