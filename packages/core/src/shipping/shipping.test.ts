import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
	db, product, variant, order, shipment, courierSettlement, shippingZone,
	eq, sql, inArray, newId
} from '@fajr/db';
import { createProduct, replaceVariants, getProduct } from '../catalog/index.ts';
import { createCart, addItem } from '../cart/index.ts';
import { place, getOrder } from '../orders/index.ts';
import {
	pushToCourier, refreshTracking, reconcile, outstandingCod, rankCouriers,
	mockCourier, type Courier
} from './index.ts';

const PHONE = '+8801700000777';
let variantId: string;
let productId: string;
const orders: string[] = [];

before(async () => {
	await db.write.update(shippingZone).set({ isActive: false });
	await db.write
		.insert(shippingZone)
		.values({ id: 'zone_ship_test', name: 'Test', districts: [], chargeMinor: 6000, advanceMinor: 0, sort: 0 })
		.onConflictDoNothing();

	productId = await createProduct({ title: 'Test Courier Item', slug: 'test-courier-item', status: 'active' });
	await replaceVariants(productId, [{ priceMinor: 100000, stockOnHand: 500 }]);
	variantId = (await getProduct(productId))!.variants[0]!.id;
});

after(async () => {
	if (orders.length) await db.write.delete(order).where(inArray(order.id, orders));
	await db.write.delete(product).where(eq(product.id, productId));
	await db.write.delete(shippingZone).where(eq(shippingZone.id, 'zone_ship_test'));
	await db.write.execute(sql`delete from courier_settlement where reference like 'TEST-%'`);
	await db.write.execute(sql`delete from shipment where district = 'Testland'`);
	await db.write.update(shippingZone).set({ isActive: true });
	await db.close();
});

async function newOrder(district = 'Dhaka', thana = 'Dhanmondi') {
	const { id: cartId } = await createCart();
	await addItem(cartId, variantId, 1);
	const result = await place({
		cartId,
		phoneE164: PHONE,
		name: 'Test Buyer',
		address: { district, thana, detail: 'House 1, Road 1' }
	});
	assert.ok(result.ok);
	orders.push(result.orderId);
	return result;
}

const failing = (retryable: boolean): Courier => ({
	name: 'mock',
	async push() {
		return { ok: false, error: 'courier said no', retryable };
	},
	async track() {
		return { ok: false, error: 'down' };
	}
});

test('pushing a parcel records the consignment and ships the order', async () => {
	const placed = await newOrder();
	const result = await pushToCourier(placed.orderId, { courier: 'mock', client: mockCourier() });

	assert.ok(result.ok);
	assert.match(result.consignmentId, /^MOCK-/);

	const detail = (await getOrder(placed.orderId))!;
	assert.equal(detail.status, 'shipped', 'handing it to the courier is what shipped means');
	assert.ok(detail.events.some((e) => e.type === 'courier.pushed'));
});

test('pushing twice returns the same parcel', async () => {
	const placed = await newOrder();
	const first = await pushToCourier(placed.orderId, { courier: 'mock', client: mockCourier() });
	const second = await pushToCourier(placed.orderId, { courier: 'mock', client: mockCourier() });

	assert.ok(first.ok && second.ok);
	assert.equal(second.duplicate, true);
	assert.equal(second.consignmentId, first.consignmentId, 'a retry must not send a second rider');

	const rows = await db.read.select().from(shipment).where(eq(shipment.orderId, placed.orderId));
	assert.equal(rows.length, 1);
});

test('the COD amount is what is still owed, not the order total', async () => {
	const placed = await newOrder();
	await db.write.update(order).set({ paidMinor: 40000 }).where(eq(order.id, placed.orderId));

	await pushToCourier(placed.orderId, { courier: 'mock', client: mockCourier() });
	const row = await db.read.query.shipment.findFirst({ where: eq(shipment.orderId, placed.orderId) });

	assert.equal(row!.codAmountMinor, placed.totalMinor - 40000, 'the rider must not collect the advance twice');
});

test('a courier rejection leaves no parcel and says whether to retry', async () => {
	const placed = await newOrder();
	const result = await pushToCourier(placed.orderId, { courier: 'mock', client: failing(false) });

	assert.equal(result.ok, false);
	assert.equal(result.ok === false && result.retryable, false, 'a 4xx means our payload is wrong');

	const rows = await db.read.select().from(shipment).where(eq(shipment.orderId, placed.orderId));
	assert.equal(rows.length, 0);

	const detail = (await getOrder(placed.orderId))!;
	assert.notEqual(detail.status, 'shipped', 'a failed push must not mark the order shipped');
	assert.ok(detail.events.some((e) => e.type === 'courier.failed'));
});

test('tracking a delivery marks the order paid', async () => {
	const placed = await newOrder();
	const pushed = await pushToCourier(placed.orderId, { courier: 'mock', client: mockCourier() });
	assert.ok(pushed.ok);

	const delivered: Courier = {
		name: 'mock',
		async push() {
			throw new Error('not used');
		},
		async track() {
			return { ok: true, status: 'delivered', deliveredAt: new Date(), raw: {} };
		}
	};

	await refreshTracking(pushed.shipmentId, delivered);

	const detail = (await getOrder(placed.orderId))!;
	assert.equal(detail.status, 'delivered');
	assert.equal(detail.paymentStatus, 'paid', 'the rider collected; the money is now owed by the courier');
});

test('a returned parcel marks the order returned', async () => {
	const placed = await newOrder();
	const pushed = await pushToCourier(placed.orderId, { courier: 'mock', client: mockCourier() });
	assert.ok(pushed.ok);

	const returned: Courier = {
		name: 'mock',
		async push() {
			throw new Error('not used');
		},
		async track() {
			return { ok: true, status: 'returned', raw: {} };
		}
	};

	await refreshTracking(pushed.shipmentId, returned);
	assert.equal((await getOrder(placed.orderId))!.status, 'returned');
});

test('reconciliation matches a payout to its parcels and reports the gap', async () => {
	const a = await newOrder();
	const b = await newOrder();
	const pa = await pushToCourier(a.orderId, { courier: 'mock', client: mockCourier() });
	const pb = await pushToCourier(b.orderId, { courier: 'mock', client: mockCourier() });
	assert.ok(pa.ok && pb.ok);

	const expected = a.totalMinor + b.totalMinor;

	const result = await reconcile({
		courier: 'mock',
		reference: 'TEST-PAYOUT-1',
		// They paid everything except a 5,000 poisha fee, and we know it.
		amountMinor: expected - 5000,
		feeMinor: 5000,
		consignmentIds: [pa.consignmentId, pb.consignmentId, 'NOT-OURS-9']
	});

	assert.equal(result.matched.length, 2);
	assert.deepEqual(result.unmatched, ['NOT-OURS-9'], 'a consignment we never sent must be flagged');
	assert.equal(result.expectedMinor, expected);
	assert.equal(result.differenceMinor, 0, 'fee accounted for, nothing missing');

	const rows = await db.read
		.select()
		.from(shipment)
		.where(inArray(shipment.id, [pa.shipmentId, pb.shipmentId]));
	assert.ok(rows.every((r) => r.settlementId && r.codSettledAt), 'settled parcels are stamped');
});

test('a short payout shows up as a positive difference', async () => {
	const a = await newOrder();
	const pa = await pushToCourier(a.orderId, { courier: 'mock', client: mockCourier() });
	assert.ok(pa.ok);

	const result = await reconcile({
		courier: 'mock',
		reference: 'TEST-PAYOUT-SHORT',
		amountMinor: a.totalMinor - 20000, // 200 taka missing, no fee declared
		consignmentIds: [pa.consignmentId]
	});

	assert.equal(result.differenceMinor, 20000, 'the shop is owed 200 taka more than arrived');
});

test('outstanding COD lists delivered parcels nobody has paid for', async () => {
	const placed = await newOrder();
	const pushed = await pushToCourier(placed.orderId, { courier: 'mock', client: mockCourier() });
	assert.ok(pushed.ok);

	await db.write
		.update(shipment)
		.set({ status: 'delivered', deliveredAt: new Date() })
		.where(eq(shipment.id, pushed.shipmentId));

	const owed = await outstandingCod('mock');
	assert.ok(owed.some((s) => s.id === pushed.shipmentId));

	await reconcile({
		courier: 'mock',
		reference: 'TEST-PAYOUT-2',
		amountMinor: placed.totalMinor,
		consignmentIds: [pushed.consignmentId]
	});

	const after = await outstandingCod('mock');
	assert.ok(!after.some((s) => s.id === pushed.shipmentId), 'settled parcels drop off the list');
});

test('routing prefers the courier that actually delivers in that thana', async () => {
	await db.write.execute(sql`delete from shipment where district = 'Testland'`);

	// "steady" is reliable in Testville; "flaky" is not — but flaky looks fine
	// everywhere else, which a global average would hide.
	const rows: (typeof shipment.$inferInsert)[] = [];
	const add = (courier: string, status: 'delivered' | 'returned', thana: string, n: number) => {
		for (let i = 0; i < n; i++) {
			rows.push({
				id: newId('shp'),
				orderId: orders[0]!,
				courier,
				consignmentId: `${courier}-${thana}-${status}-${i}-${Math.random().toString(36).slice(2, 8)}`,
				status,
				district: 'Testland',
				thana,
				codAmountMinor: 0,
				idempotencyKey: newId('idem')
			});
		}
	};
	add('steady', 'delivered', 'Testville', 18);
	add('steady', 'returned', 'Testville', 2);
	add('flaky', 'delivered', 'Testville', 6);
	add('flaky', 'returned', 'Testville', 14);
	add('flaky', 'delivered', 'Elsewhere', 60);

	await db.write.insert(shipment).values(rows);

	const ranked = await rankCouriers('Testland', 'Testville', ['steady', 'flaky']);
	assert.equal(ranked[0]!.courier, 'steady');
	assert.equal(ranked[0]!.basis, 'thana', 'judged on this thana, not a global average');
	assert.ok(ranked[0]!.successRate > ranked[1]!.successRate);
});

test('a thin sample falls back to district, then to everywhere', async () => {
	const ranked = await rankCouriers('Testland', 'NoDataHere', ['steady', 'flaky']);
	assert.ok(['district', 'global'].includes(ranked[0]!.basis), `got ${ranked[0]!.basis}`);

	const blind = await rankCouriers(null, null, ['brand-new-courier']);
	assert.equal(blind[0]!.basis, 'none');
	assert.ok(blind[0]!.successRate > 0.5, 'an unknown courier starts trusted, not blacklisted');
});

// ── delivery zones follow the country ───────────────────────────────────────

import { countryOf } from '@fajr/schemas';

test('every market ships with its own zones, not Bangladesh’s', () => {
	for (const code of ['BD', 'PK', 'AE', 'SA', 'KW', 'QA', 'BH', 'OM']) {
		const zones = countryOf(code).zones;
		assert.ok(zones.length >= 2, `${code} needs a near zone and a catch-all`);

		// Exactly one catch-all, and it must be last, or the fallback never fires.
		const catchAlls = zones.filter((z) => z.areas.length === 0);
		assert.equal(catchAlls.length, 1, `${code} must have one catch-all zone`);
		assert.equal(zones.at(-1)!.areas.length, 0, `${code}'s catch-all must sort last`);

		// The near zone must be cheaper, or the whole distinction is pointless.
		assert.ok(
			zones[0]!.chargeMinor < zones.at(-1)!.chargeMinor,
			`${code}: the nearest zone should cost less than everywhere else`
		);
	}
});

test('a Gulf shop never offers a Bangladeshi zone, and the reverse', () => {
	const uae = countryOf('AE').zones.flatMap((z) => z.areas);
	assert.ok(uae.includes('Dubai'));
	assert.equal(uae.includes('Dhaka'), false);

	const bd = countryOf('BD').zones.flatMap((z) => z.areas);
	assert.ok(bd.includes('Dhaka'));
	assert.equal(bd.includes('Dubai'), false);
});

test('the Gulf collects no advance, South Asia collects the delivery charge', () => {
	// COD in BD prepays the delivery fee; the Gulf does not work that way.
	assert.ok(countryOf('BD').zones.every((z) => z.advanceMinor > 0));
	assert.ok(countryOf('AE').zones.every((z) => z.advanceMinor === 0));
});
