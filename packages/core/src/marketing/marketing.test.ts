import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
	db, product, variant, order, cart, coupon, couponRedemption, shippingZone,
	eq, sql, inArray
} from '@fajr/db';
import { createProduct, replaceVariants, getProduct } from '../catalog/index.ts';
import { createCart, addItem } from '../cart/index.ts';
import { place, cancel, getOrder } from '../orders/index.ts';
import {
	createCoupon, evaluate, quoteFor, listCoupons, findAbandoned, attachPhone, markRecovered
} from './index.ts';

const PHONE = '+8801700000555';
const OTHER = '+8801700000556';
/** Dedicated numbers: a cart is skipped if its owner ordered afterwards, so
 *  reusing a buyer's phone here would make these tests depend on test order. */
const CART_A = '+8801700000557';
const CART_B = '+8801700000558';
let variantId: string;
let productId: string;
const orders: string[] = [];
const coupons: string[] = [];

before(async () => {
	await db.write.update(shippingZone).set({ isActive: false });
	await db.write
		.insert(shippingZone)
		.values({ id: 'zone_mkt_test', name: 'Test', districts: [], chargeMinor: 6000, advanceMinor: 0, sort: 0 })
		.onConflictDoNothing();

	productId = await createProduct({ title: 'Test Coupon Item', slug: 'test-coupon-item', status: 'active' });
	await replaceVariants(productId, [{ priceMinor: 100000, stockOnHand: 500 }]);
	variantId = (await getProduct(productId))!.variants[0]!.id;
});

after(async () => {
	if (orders.length) await db.write.delete(order).where(inArray(order.id, orders));
	if (coupons.length) await db.write.delete(coupon).where(inArray(coupon.id, coupons));
	await db.write.delete(product).where(eq(product.id, productId));
	await db.write.delete(shippingZone).where(eq(shippingZone.id, 'zone_mkt_test'));
	await db.write.execute(sql`delete from cart where phone_e164 like '+88017000005%'`);
	await db.write.execute(sql`delete from coupon_redemption where phone_e164 like '+88017000005%'`);
	await db.write.update(shippingZone).set({ isActive: true });
	await db.close();
});

const make = async (input: Parameters<typeof createCoupon>[0]) => {
	const id = await createCoupon(input);
	coupons.push(id);
	return id;
};

async function orderWith(code: string | null, qty = 2, phone = PHONE) {
	const { id: cartId } = await createCart();
	await addItem(cartId, variantId, qty);
	const result = await place({
		cartId,
		phoneE164: phone,
		name: 'Buyer',
		address: { district: 'Dhaka', detail: 'Road 1' },
		couponCode: code
	});
	if (result.ok) orders.push(result.orderId);
	return result;
}

// ── the maths ───────────────────────────────────────────────────────────────

test('a percentage discount uses integer maths and respects its cap', () => {
	const row = {
		code: 'X', type: 'percent' as const, value: 1500, maxDiscountMinor: 20000, description: null
	} as never;

	// 15% of 200000 is 30000, capped at 20000.
	assert.equal(quoteFor(row, 200000, 6000).discountMinor, 20000);
	// 15% of 100000 is 15000, under the cap.
	assert.equal(quoteFor(row, 100000, 6000).discountMinor, 15000);
});

test('a discount can never exceed what it applies to', () => {
	const huge = { code: 'X', type: 'fixed' as const, value: 999999, maxDiscountMinor: null, description: null } as never;
	assert.equal(quoteFor(huge, 50000, 6000).discountMinor, 50000, 'an order must never go negative');

	const ship = { code: 'X', type: 'free_shipping' as const, value: 0, maxDiscountMinor: null, description: null } as never;
	const q = quoteFor(ship, 50000, 6000);
	assert.equal(q.discountMinor, 6000, 'free shipping is worth exactly the delivery charge');
	assert.equal(q.freeShipping, true);
});

// ── the rules ───────────────────────────────────────────────────────────────

test('an unknown or inactive code is refused', async () => {
	const missing = await evaluate('NOPE', { subtotalMinor: 100000, shippingMinor: 6000 });
	assert.equal(missing.ok === false && missing.reason, 'not_found');

	await make({ code: 'TEST-OFF', type: 'fixed', value: 5000 });
	await db.write.update(coupon).set({ isActive: false }).where(eq(coupon.code, 'TEST-OFF'));

	const off = await evaluate('test-off', { subtotalMinor: 100000, shippingMinor: 6000 });
	assert.equal(off.ok === false && off.reason, 'inactive', 'and matching is case-insensitive');
});

test('an expired code is refused, and a future one is not yet live', async () => {
	await make({ code: 'TEST-PAST', type: 'fixed', value: 5000, endsAt: new Date(Date.now() - 86_400_000) });
	await make({ code: 'TEST-FUTURE', type: 'fixed', value: 5000, startsAt: new Date(Date.now() + 86_400_000) });

	const past = await evaluate('TEST-PAST', { subtotalMinor: 100000, shippingMinor: 6000 });
	const future = await evaluate('TEST-FUTURE', { subtotalMinor: 100000, shippingMinor: 6000 });

	assert.equal(past.ok === false && past.reason, 'expired');
	assert.equal(future.ok === false && future.reason, 'not_started');
});

test('a minimum spend is enforced and reported', async () => {
	await make({ code: 'TEST-MIN', type: 'percent', value: 1000, minSubtotalMinor: 150000 });

	const below = await evaluate('TEST-MIN', { subtotalMinor: 100000, shippingMinor: 6000 });
	assert.equal(below.ok === false && below.reason, 'below_minimum');
	assert.equal(below.ok === false && below.minSubtotalMinor, 150000, 'the customer is told what they need');

	const above = await evaluate('TEST-MIN', { subtotalMinor: 200000, shippingMinor: 6000 });
	assert.equal(above.ok, true);
});

// ── redemption ──────────────────────────────────────────────────────────────

test('a coupon actually comes off the order total', async () => {
	await make({ code: 'TEST-TAKA', type: 'fixed', value: 25000, perCustomerLimit: 5 });
	const result = await orderWith('TEST-TAKA');
	assert.ok(result.ok);

	const detail = (await getOrder(result.orderId))!;
	assert.equal(detail.subtotalMinor, 200000);
	assert.equal(detail.discountMinor, 25000);
	assert.equal(detail.totalMinor, 200000 + 6000 - 25000);
	assert.equal(detail.couponCode, 'TEST-TAKA');
});

test('a per-customer limit stops the same phone using it twice', async () => {
	await make({ code: 'TEST-ONCE', type: 'fixed', value: 10000, perCustomerLimit: 1 });

	const first = await orderWith('TEST-ONCE');
	assert.ok(first.ok);

	const second = await orderWith('TEST-ONCE');
	assert.equal(second.ok, false);
	assert.equal(second.ok === false && second.couponError, 'already_used');

	// A different customer is unaffected.
	const other = await orderWith('TEST-ONCE', 2, OTHER);
	assert.equal(other.ok, true);
});

test('a total usage limit holds under a race', async () => {
	await make({ code: 'TEST-RACE', type: 'fixed', value: 1000, usageLimit: 3, perCustomerLimit: 99 });

	// Ten customers go for three uses at the same moment.
	const results = await Promise.all(Array.from({ length: 10 }, () => orderWith('TEST-RACE', 1)));
	const won = results.filter((r) => r.ok).length;

	// Orders still place; only the discount is limited — losing a sale over a
	// coupon would be worse than the coupon.
	const withDiscount = await db.read
		.select({ n: sql<number>`count(*)` })
		.from(couponRedemption)
		.where(eq(couponRedemption.phoneE164, PHONE));

	const row = await db.read.query.coupon.findFirst({ where: eq(coupon.code, 'TEST-RACE') });
	assert.equal(row!.usageCount, 3, 'never more than the limit, however many raced');
	assert.ok(won >= 3, `expected at least the winners to place, got ${won}`);
});

test('cancelling an order hands the coupon use back', async () => {
	await make({ code: 'TEST-REFUND', type: 'fixed', value: 5000, usageLimit: 1, perCustomerLimit: 9 });

	const first = await orderWith('TEST-REFUND');
	assert.ok(first.ok);
	assert.equal((await db.read.query.coupon.findFirst({ where: eq(coupon.code, 'TEST-REFUND') }))!.usageCount, 1);

	await cancel(first.orderId, 'changed mind', { type: 'admin' });

	const row = await db.read.query.coupon.findFirst({ where: eq(coupon.code, 'TEST-REFUND') });
	assert.equal(row!.usageCount, 0, 'a cancelled order should not consume the last use');

	const again = await orderWith('TEST-REFUND');
	assert.equal(again.ok, true, 'and the code works again');
});

test('a bad code refuses the order rather than silently ignoring it', async () => {
	const result = await orderWith('TEST-DOES-NOT-EXIST');
	assert.equal(result.ok, false);
	assert.equal(result.ok === false && result.couponError, 'not_found');
});

// ── abandoned carts ─────────────────────────────────────────────────────────

test('an abandoned cart is found only once it has gone quiet', async () => {
	const { id: cartId } = await createCart();
	await addItem(cartId, variantId, 2);
	await attachPhone(cartId, CART_A);

	const fresh = await findAbandoned();
	assert.ok(!fresh.some((c) => c.cartId === cartId), 'a cart still being used is not abandoned');

	await db.write
		.update(cart)
		.set({ updatedAt: new Date(Date.now() - 5 * 3_600_000) })
		.where(eq(cart.id, cartId));

	const stale = await findAbandoned();
	const found = stale.find((c) => c.cartId === cartId);
	assert.ok(found, 'four hours of silence is abandoned');
	assert.equal(found.itemCount, 2);
	assert.equal(found.subtotalMinor, 200000);
});

test('a cart is never chased twice', async () => {
	const { id: cartId } = await createCart();
	await addItem(cartId, variantId, 1);
	await attachPhone(cartId, CART_B);
	await db.write
		.update(cart)
		.set({ updatedAt: new Date(Date.now() - 5 * 3_600_000) })
		.where(eq(cart.id, cartId));

	assert.ok((await findAbandoned()).some((c) => c.cartId === cartId));
	await markRecovered(cartId);
	assert.ok(!(await findAbandoned()).some((c) => c.cartId === cartId));
});

test('an anonymous cart is skipped — there is nobody to remind', async () => {
	const { id: cartId } = await createCart();
	await addItem(cartId, variantId, 1);
	await db.write
		.update(cart)
		.set({ updatedAt: new Date(Date.now() - 5 * 3_600_000) })
		.where(eq(cart.id, cartId));

	assert.ok(!(await findAbandoned()).some((c) => c.cartId === cartId));
});
