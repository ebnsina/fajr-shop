import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
	db, product, variant, order, orderItem, cart, shippingZone, outbox, payment,
	newId, eq, and, sql, inArray
} from '@fajr/db';
import { createProduct, replaceVariants, getProduct } from '../catalog/index.ts';
import { createCart, addItem, view, reserve, releaseExpiredReservations } from '../cart/index.ts';
import { place, listOrders, cancel, markShipped, markDelivered, recordManualPayment, confirmPayment, setVerification, getOrder, trackOrder, quote } from './index.ts';

const PHONE = '+8801700000009';
const ADDRESS = { district: 'Dhaka', thana: 'Dhanmondi', detail: 'House 4, Road 7' };
let productId: string;
let variantId: string;
const orders: string[] = [];

before(async () => {
	// The seed ships real zones; this suite needs to own the zone table while it
	// runs, or two catch-alls compete and the winner depends on insert order.
	await db.write.update(shippingZone).set({ isActive: false });

	await db.write.insert(shippingZone).values([
		{ id: 'zone_test_dhaka', name: 'Inside Dhaka', districts: ['Dhaka'], chargeMinor: 6000, advanceMinor: 6000, sort: 0 },
		{ id: 'zone_test_other', name: 'Outside Dhaka', districts: [], chargeMinor: 12000, advanceMinor: 12000, freeOverMinor: 500000, sort: 1 }
	]).onConflictDoNothing();

	productId = await createProduct({ title: 'Test Order Saree', slug: 'test-order-saree', status: 'active' });
	await replaceVariants(productId, [{ priceMinor: 100000, stockOnHand: 10 }]);
	variantId = (await getProduct(productId))!.variants[0]!.id;
});

beforeEach(async () => {
	await db.write.update(variant).set({ stockOnHand: 10, stockReserved: 0 }).where(eq(variant.id, variantId));
});

after(async () => {
	if (orders.length) await db.write.delete(order).where(inArray(order.id, orders));
	await db.write.delete(product).where(eq(product.id, productId));
	await db.write.delete(shippingZone).where(inArray(shippingZone.id, ['zone_test_dhaka', 'zone_test_other']));
	await db.write.update(shippingZone).set({ isActive: true });
	await db.write.execute(sql`delete from cart where id like 'crt_%' and status in ('open','ordered')`);
	await db.close();
});

async function cartWith(qty: number) {
	const { id } = await createCart();
	await addItem(id, variantId, qty);
	return id;
}

async function placeOne(qty = 1, extra: Partial<Parameters<typeof place>[0]> = {}) {
	const cartId = await cartWith(qty);
	const result = await place({ cartId, phoneE164: PHONE, name: 'Rina', address: ADDRESS, ...extra });
	if (result.ok) orders.push(result.orderId);
	return result;
}

test('shipping quote picks the district zone, falls back to the catch-all', async () => {
	assert.equal((await quote('Dhaka', 100000)).shippingMinor, 6000);
	assert.equal((await quote('Rangpur', 100000)).shippingMinor, 12000, 'unlisted district uses the catch-all');
	const free = await quote('Rangpur', 600000);
	assert.equal(free.shippingMinor, 0, 'free over threshold');
	assert.equal(free.advanceMinor, 0, 'nothing to prepay when delivery is free');
});

test('placing an order snapshots the lines and totals', async () => {
	const result = await placeOne(2);
	assert.ok(result.ok);
	assert.equal(result.totalMinor, 200000 + 6000);
	assert.equal(result.advanceMinor, 6000, 'COD prepays the delivery charge');
	assert.match(result.publicCode, /^[0-9A-Z]{6}$/);

	const detail = (await getOrder(result.orderId))!;
	assert.equal(detail.items.length, 1);
	assert.equal(detail.items[0]!.title, 'Test Order Saree');
	assert.equal(detail.items[0]!.unitPriceMinor, 100000, 'price is frozen on the line');
	assert.equal(detail.address?.district, 'Dhaka');
});

test('a snapshot survives the product changing afterwards', async () => {
	const result = await placeOne(1);
	assert.ok(result.ok);
	await db.write.update(product).set({ title: 'Renamed Later' }).where(eq(product.id, productId));
	await db.write.update(variant).set({ priceMinor: 999999 }).where(eq(variant.id, variantId));

	const detail = (await getOrder(result.orderId))!;
	assert.equal(detail.items[0]!.title, 'Test Order Saree', 'the invoice must say what it said');
	assert.equal(detail.items[0]!.unitPriceMinor, 100000);

	await db.write.update(product).set({ title: 'Test Order Saree' }).where(eq(product.id, productId));
	await db.write.update(variant).set({ priceMinor: 100000 }).where(eq(variant.id, variantId));
});

test('placing an order reserves stock without shipping it', async () => {
	const result = await placeOne(3);
	assert.ok(result.ok);
	const v = (await db.read.query.variant.findFirst({ where: eq(variant.id, variantId) }))!;
	assert.equal(v.stockReserved, 3);
	assert.equal(v.stockOnHand, 10, 'on-hand only moves at dispatch');
});

test('an order cannot be placed for stock that is gone', async () => {
	await db.write.update(variant).set({ stockOnHand: 1 }).where(eq(variant.id, variantId));
	const cartId = await cartWith(1);
	// Someone else takes the last one between browsing and paying.
	await db.write.update(variant).set({ stockReserved: 1 }).where(eq(variant.id, variantId));

	const result = await place({ cartId, phoneE164: PHONE, name: 'Rina', address: ADDRESS });
	assert.equal(result.ok, false);
	assert.equal(result.ok === false && result.reason, 'stock_changed');

	const rows = await db.read.select().from(order).where(eq(order.phoneE164, PHONE));
	assert.ok(!rows.some((r) => r.subtotalMinor === 100000 && r.status === 'pending' && !orders.includes(r.id)),
		'a failed placement must leave no order behind');
});

test('placing enqueues each side effect exactly once', async () => {
	const result = await placeOne(1);
	assert.ok(result.ok);

	const rows = await db.read.select().from(outbox).where(eq(outbox.idempotencyKey, result.orderId));
	const topics = rows.map((r) => r.topic).sort();

	// Notifications and ad attribution ride separate topics so a failure in one
	// cannot hold up the other — but neither may be enqueued twice.
	assert.deepEqual(topics, ['order.placed', 'order.purchased']);
	assert.equal(new Set(topics).size, topics.length, 'no topic is duplicated');
	assert.ok(rows.every((r) => r.processedAt === null), 'the worker has not run yet');
});

test('cancelling hands the stock back', async () => {
	const result = await placeOne(4);
	assert.ok(result.ok);
	await cancel(result.orderId, 'Customer changed their mind', { type: 'admin', id: 'adm_test' });

	const v = (await db.read.query.variant.findFirst({ where: eq(variant.id, variantId) }))!;
	assert.equal(v.stockReserved, 0);
	assert.equal(v.stockOnHand, 10);
	assert.equal((await getOrder(result.orderId))!.status, 'cancelled');
});

test('cancelling twice does not release stock twice', async () => {
	const result = await placeOne(2);
	assert.ok(result.ok);
	await cancel(result.orderId, 'first', { type: 'admin' });
	await cancel(result.orderId, 'second', { type: 'admin' });
	const v = (await db.read.query.variant.findFirst({ where: eq(variant.id, variantId) }))!;
	assert.equal(v.stockReserved, 0, 'not negative, not double-released');
});

test('shipping turns held stock into sold stock', async () => {
	const result = await placeOne(3);
	assert.ok(result.ok);
	await markShipped(result.orderId, { type: 'admin' });

	const v = (await db.read.query.variant.findFirst({ where: eq(variant.id, variantId) }))!;
	assert.equal(v.stockOnHand, 7);
	assert.equal(v.stockReserved, 0);
});

test('cancelling after dispatch does not resurrect stock', async () => {
	const result = await placeOne(2);
	assert.ok(result.ok);
	await markShipped(result.orderId, { type: 'admin' });
	await cancel(result.orderId, 'Returned to sender', { type: 'admin' });

	const v = (await db.read.query.variant.findFirst({ where: eq(variant.id, variantId) }))!;
	assert.equal(v.stockOnHand, 8, 'shipped goods are gone until a return is booked in');
});

test('a resubmitted bKash payment records once', async () => {
	const result = await placeOne(1);
	assert.ok(result.ok);

	const first = await recordManualPayment(result.orderId, { reference: 'BKA123XYZ', amountMinor: 6000 }, { type: 'customer' });
	const second = await recordManualPayment(result.orderId, { reference: 'bka123xyz', amountMinor: 6000 }, { type: 'customer' });

	assert.equal(first.duplicate, undefined);
	assert.equal(second.duplicate, true, 'same trxID, case-insensitive, is the same payment');

	const rows = await db.read.select().from(payment).where(and(eq(payment.orderId, result.orderId), eq(payment.reference, 'BKA123XYZ')));
	assert.equal(rows.length, 1);
});

test('confirming an advance marks the order part-paid, not paid', async () => {
	const result = await placeOne(1);
	assert.ok(result.ok);
	await recordManualPayment(result.orderId, { reference: 'ADV555', amountMinor: 6000 }, { type: 'customer' });

	const p = (await db.read.query.payment.findFirst({ where: eq(payment.reference, 'ADV555') }))!;
	await confirmPayment(p.id, { type: 'admin', id: 'adm_test' });

	const detail = (await getOrder(result.orderId))!;
	assert.equal(detail.paidMinor, 6000);
	assert.equal(detail.paymentStatus, 'advance_paid', 'the delivery charge is not the whole order');
});

test('confirming the same payment twice does not double-count it', async () => {
	const result = await placeOne(1);
	assert.ok(result.ok);
	await recordManualPayment(result.orderId, { reference: 'ONCE1', amountMinor: 6000 }, { type: 'customer' });
	const p = (await db.read.query.payment.findFirst({ where: eq(payment.reference, 'ONCE1') }))!;

	await confirmPayment(p.id, { type: 'admin' });
	await confirmPayment(p.id, { type: 'admin' });

	assert.equal((await getOrder(result.orderId))!.paidMinor, 6000);
});

test('the verification call drives the order status', async () => {
	const result = await placeOne(1);
	assert.ok(result.ok);
	assert.equal((await getOrder(result.orderId))!.verificationStatus, 'pending');

	await setVerification(result.orderId, 'confirmed', { type: 'admin', id: 'adm_test' }, 'Customer confirmed');
	const detail = (await getOrder(result.orderId))!;
	assert.equal(detail.verificationStatus, 'confirmed');
	assert.equal(detail.status, 'confirmed');
	assert.ok(detail.events.some((e) => e.type === 'verification.confirmed'));
});

test('cancelling on the verification call releases stock', async () => {
	const result = await placeOne(3);
	assert.ok(result.ok);
	await setVerification(result.orderId, 'cancelled', { type: 'admin' }, 'Fake order');

	const v = (await db.read.query.variant.findFirst({ where: eq(variant.id, variantId) }))!;
	assert.equal(v.stockReserved, 0);
	assert.equal((await getOrder(result.orderId))!.status, 'cancelled');
});

test('tracking needs the code AND the phone', async () => {
	const result = await placeOne(1);
	assert.ok(result.ok);
	assert.ok(await trackOrder(result.publicCode, PHONE));
	assert.equal(await trackOrder(result.publicCode, '+8801799999999'), null, 'a code alone must not expose an order');
	assert.equal(await trackOrder('ZZZZZZ', PHONE), null);
});

test('an abandoned checkout gives its stock back', async () => {
	const cartId = await cartWith(5);
	assert.equal((await reserve(cartId)).ok, true);
	assert.equal((await db.read.query.variant.findFirst({ where: eq(variant.id, variantId) }))!.stockReserved, 5);

	await db.write.update(cart).set({ reservedUntil: new Date(Date.now() - 60_000) }).where(eq(cart.id, cartId));
	const freed = await releaseExpiredReservations();

	assert.ok(freed >= 1);
	assert.equal((await db.read.query.variant.findFirst({ where: eq(variant.id, variantId) }))!.stockReserved, 0);
});

test('a cart that already reserved does not double-reserve at checkout', async () => {
	const cartId = await cartWith(4);
	await reserve(cartId);
	const result = await place({ cartId, phoneE164: PHONE, name: 'Rina', address: ADDRESS });
	assert.ok(result.ok);
	orders.push(result.orderId);

	const v = (await db.read.query.variant.findFirst({ where: eq(variant.id, variantId) }))!;
	assert.equal(v.stockReserved, 4, 'held once, not twice');
});

test('the order list counts items, not rows', async () => {
	const cartId = await cartWith(3);
	const result = await place({ cartId, phoneE164: PHONE, name: 'Rina', address: ADDRESS });
	assert.ok(result.ok);
	orders.push(result.orderId);

	const { rows } = await listOrders({ search: result.publicCode });
	// A correlated subquery here silently returns 0 for every row — the count
	// must come from a join, and it must count quantity rather than lines.
	assert.equal(Number(rows[0]!.itemCount), 3);
});

test('an empty cart cannot be ordered', async () => {
	const { id } = await createCart();
	const result = await place({ cartId: id, phoneE164: PHONE, name: 'Rina', address: ADDRESS });
	assert.equal(result.ok, false);
	assert.equal(result.ok === false && result.reason, 'empty_cart');
});
