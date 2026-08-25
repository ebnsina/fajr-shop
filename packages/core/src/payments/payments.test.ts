import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { db, product, order, payment, shippingZone, eq, sql, inArray } from '@fajr/db';
import { createProduct, replaceVariants, getProduct } from '../catalog/index.ts';
import { createCart, addItem } from '../cart/index.ts';
import { place, getOrder } from '../orders/index.ts';
import { settle, type VerifiedPayment } from './index.ts';
import { buildPayload, hashPhone, hashEmail, type CapiEvent } from '../analytics/index.ts';

const PHONE = '+8801700000888';
let variantId: string;
let productId: string;
const orders: string[] = [];

before(async () => {
	await db.write.update(shippingZone).set({ isActive: false });
	await db.write
		.insert(shippingZone)
		.values({ id: 'zone_pay_test', name: 'T', districts: [], chargeMinor: 6000, advanceMinor: 6000, sort: 0 })
		.onConflictDoNothing();

	productId = await createProduct({ title: 'Test Pay Item', slug: 'test-pay-item', status: 'active' });
	await replaceVariants(productId, [{ priceMinor: 100000, stockOnHand: 200 }]);
	variantId = (await getProduct(productId))!.variants[0]!.id;
});

after(async () => {
	if (orders.length) await db.write.delete(order).where(inArray(order.id, orders));
	await db.write.delete(product).where(eq(product.id, productId));
	await db.write.delete(shippingZone).where(eq(shippingZone.id, 'zone_pay_test'));
	await db.write.update(shippingZone).set({ isActive: true });
	await db.close();
});

async function newOrder() {
	const { id: cartId } = await createCart();
	await addItem(cartId, variantId, 2);
	const result = await place({
		cartId,
		phoneE164: PHONE,
		name: 'Payer',
		address: { district: 'Dhaka', detail: 'Road 2' }
	});
	assert.ok(result.ok);
	orders.push(result.orderId);
	return result;
}

const verified = (over: Partial<VerifiedPayment> = {}): VerifiedPayment => ({
	ok: true,
	orderId: null,
	amountMinor: 0,
	currency: 'BDT',
	reference: 'BANK123',
	status: 'succeeded',
	raw: {},
	...over
});

// ── settlement guards ───────────────────────────────────────────────────────

test('an unverified callback is never credited', async () => {
	const placed = await newOrder();
	const result = await settle(verified({ ok: false, orderId: placed.orderId, amountMinor: 999999 }));

	assert.equal(result.ok, false);
	assert.equal(result.ok === false && result.reason, 'unverified');
	assert.equal((await getOrder(placed.orderId))!.paidMinor, 0, 'a forged callback must move no money');
});

test('a callback for an unknown order is rejected', async () => {
	const result = await settle(verified({ orderId: 'ord_does_not_exist', amountMinor: 10000 }));
	assert.equal(result.ok === false && result.reason, 'unknown_order');
});

test('an underpayment is rejected rather than treated as partial', async () => {
	const placed = await newOrder();
	// The order wants a 6,000 poisha advance; the callback claims 100.
	const result = await settle(verified({ orderId: placed.orderId, amountMinor: 100 }));

	assert.equal(result.ok === false && result.reason, 'amount_mismatch');
	assert.equal((await getOrder(placed.orderId))!.paidMinor, 0, 'nothing is credited on a mismatch');
});

test('a verified payment confirms the order', async () => {
	const placed = await newOrder();
	const result = await settle(
		verified({ orderId: placed.orderId, amountMinor: placed.advanceMinor, reference: 'BANK-OK-1' })
	);
	assert.ok(result.ok);

	const detail = (await getOrder(placed.orderId))!;
	assert.equal(detail.paidMinor, placed.advanceMinor);
	assert.equal(detail.paymentStatus, 'advance_paid');
	// Money in the bank is stronger evidence than a phone call.
	assert.equal(detail.status, 'confirmed');
	assert.equal(detail.verificationStatus, 'confirmed');
});

test('a retried IPN credits the order once', async () => {
	const placed = await newOrder();
	const payload = verified({
		orderId: placed.orderId,
		amountMinor: placed.advanceMinor,
		reference: 'BANK-RETRY-1'
	});

	const first = await settle(payload);
	const second = await settle(payload);

	assert.ok(first.ok && second.ok);
	assert.equal(second.duplicate, true, 'gateways retry; a retry is not a second payment');

	const rows = await db.read.select().from(payment).where(eq(payment.orderId, placed.orderId));
	assert.equal(rows.filter((r) => r.reference === 'BANK-RETRY-1').length, 1);
	assert.equal((await getOrder(placed.orderId))!.paidMinor, placed.advanceMinor);
});

test('paying in full marks the order paid, not advance_paid', async () => {
	const placed = await newOrder();
	const result = await settle(
		verified({ orderId: placed.orderId, amountMinor: placed.totalMinor, reference: 'BANK-FULL-1' })
	);
	assert.ok(result.ok);
	assert.equal((await getOrder(placed.orderId))!.paymentStatus, 'paid');
});

// ── Conversions API ─────────────────────────────────────────────────────────

test('phone numbers are normalised before hashing', () => {
	// All three are the same person; a raw hash of each would be three misses.
	const a = hashPhone('+8801712345678');
	const b = hashPhone('01712345678');
	const c = hashPhone('880 1712-345678');

	assert.equal(a, b);
	assert.equal(b, c);
	assert.match(a, /^[0-9a-f]{64}$/);
});

test('emails are lowercased and trimmed before hashing', () => {
	assert.equal(hashEmail('  Rina@Example.COM '), hashEmail('rina@example.com'));
});

test('the payload hashes PII and leaves click ids alone', () => {
	const event: CapiEvent = {
		eventName: 'Purchase',
		eventId: 'ord_abc',
		eventTime: new Date('2026-08-25T10:00:00Z'),
		user: {
			phone: '01712345678',
			email: 'rina@example.com',
			fbp: 'fb.1.1700000000.123456',
			ip: '203.0.113.9',
			userAgent: 'Mozilla/5.0'
		},
		value: 2060,
		currency: 'BDT',
		contentIds: ['SKU-1'],
		numItems: 2
	};

	const payload = buildPayload([event]);
	const sent = payload.data[0]!;

	assert.equal(sent.event_time, 1787652000, 'seconds, not milliseconds');
	assert.match(sent.user_data.ph![0]!, /^[0-9a-f]{64}$/);
	assert.match(sent.user_data.em![0]!, /^[0-9a-f]{64}$/);
	// fbp is an opaque id already; hashing it destroys the match.
	assert.equal(sent.user_data.fbp, 'fb.1.1700000000.123456');
	assert.equal(sent.user_data.client_ip_address, '203.0.113.9');
	assert.equal(sent.custom_data.value, 2060);
	assert.equal(sent.custom_data.content_type, 'product');
});

test('no raw personal data reaches the payload', () => {
	const payload = buildPayload([
		{
			eventName: 'Purchase',
			eventId: 'x',
			eventTime: new Date(),
			user: { phone: '01712345678', email: 'rina@example.com', firstName: 'Rina' }
		}
	]);

	const serialised = JSON.stringify(payload);
	for (const raw of ['01712345678', '8801712345678', 'rina@example.com', 'Rina']) {
		assert.ok(!serialised.includes(raw), `${raw} must never leave the server unhashed`);
	}
});

test('the event id is carried through, so the pixel is not double-counted', () => {
	const payload = buildPayload([
		{ eventName: 'Purchase', eventId: 'ord_dedupe_me', eventTime: new Date(), user: {} }
	]);
	assert.equal(payload.data[0]!.event_id, 'ord_dedupe_me');
});
