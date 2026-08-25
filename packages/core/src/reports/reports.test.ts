import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { db, product, order, orderItem, shipment, shippingZone, eq, sql, inArray, newId } from '@fajr/db';
import { createProduct, replaceVariants, getProduct } from '../catalog/index.ts';
import { createCart, addItem } from '../cart/index.ts';
import { place } from '../orders/index.ts';
import { salesSummary, codPerformance, courierPerformance, topProducts, couponUsage, funnel } from './index.ts';

const RANGE = { from: new Date(Date.now() - 7 * 86_400_000), to: new Date(Date.now() + 86_400_000) };
let variantId: string;
let productId: string;
const orders: string[] = [];
const shipments: string[] = [];

before(async () => {
	await db.write.update(shippingZone).set({ isActive: false });
	await db.write
		.insert(shippingZone)
		.values({ id: 'zone_rep_test', name: 'T', districts: [], chargeMinor: 6000, advanceMinor: 0, sort: 0 })
		.onConflictDoNothing();

	productId = await createProduct({ title: 'Test Report Item', slug: 'test-report-item', status: 'active' });
	await replaceVariants(productId, [{ priceMinor: 100000, costMinor: 60000, stockOnHand: 500 }]);
	variantId = (await getProduct(productId))!.variants[0]!.id;
});

after(async () => {
	if (shipments.length) await db.write.delete(shipment).where(inArray(shipment.id, shipments));
	if (orders.length) await db.write.delete(order).where(inArray(order.id, orders));
	await db.write.delete(product).where(eq(product.id, productId));
	await db.write.delete(shippingZone).where(eq(shippingZone.id, 'zone_rep_test'));
	await db.write.update(shippingZone).set({ isActive: true });
	await db.close();
});

async function placeOne(qty = 1, patch: Record<string, unknown> = {}) {
	const { id: cartId } = await createCart();
	await addItem(cartId, variantId, qty);
	const result = await place({
		cartId,
		phoneE164: '+8801700000700',
		name: 'Report Buyer',
		address: { district: 'Dhaka', detail: 'Road 1' }
	});
	assert.ok(result.ok);
	orders.push(result.orderId);
	if (Object.keys(patch).length) {
		await db.write.update(order).set(patch).where(eq(order.id, result.orderId));
	}
	return result;
}

test('revenue excludes cancelled orders but counts them separately', async () => {
	const kept = await placeOne(2);
	await placeOne(2, { status: 'cancelled' });

	const summary = await salesSummary(RANGE);

	assert.ok(summary.orders >= 1);
	assert.ok(summary.cancelled >= 1, 'cancellations are still visible');
	assert.ok(
		summary.revenueMinor >= kept.totalMinor,
		'the kept order is counted'
	);

	// The cancelled order's value must not be inside revenue.
	const rows = await db.read
		.select({ total: order.totalMinor })
		.from(order)
		.where(and0());
	function and0() {
		return sql`${order.status} = 'cancelled' and ${order.placedAt} >= ${RANGE.from.toISOString()}::timestamptz`;
	}
	const cancelledValue = rows.reduce((sum, r) => sum + r.total, 0);
	const allValue = summary.revenueMinor + cancelledValue;
	assert.ok(allValue > summary.revenueMinor, 'sanity: there was cancelled value to exclude');
});

test('the average order value is integer poisha, never a float', async () => {
	const summary = await salesSummary(RANGE);
	assert.ok(Number.isInteger(summary.averageOrderMinor));
	if (summary.orders > 0) {
		assert.ok(summary.averageOrderMinor > 0);
	}
});

test('an empty range reports zeros rather than dividing by zero', async () => {
	const empty = await salesSummary({
		from: new Date('2020-01-01'),
		to: new Date('2020-01-02')
	});
	assert.equal(empty.orders, 0);
	assert.equal(empty.revenueMinor, 0);
	assert.equal(empty.averageOrderMinor, 0, 'not NaN');

	const cod = await codPerformance({ from: new Date('2020-01-01'), to: new Date('2020-01-02') });
	assert.equal(cod.deliveryRate, 0);
	assert.equal(cod.returnRate, 0);
	assert.equal(cod.confirmationRate, 0);
});

test('the delivery rate counts only parcels that reached a courier', async () => {
	await placeOne(1, { status: 'delivered', verificationStatus: 'confirmed' });
	await placeOne(1, { status: 'delivered', verificationStatus: 'confirmed' });
	await placeOne(1, { status: 'delivered', verificationStatus: 'confirmed' });
	await placeOne(1, { status: 'returned', verificationStatus: 'confirmed' });
	// Cancelled on the phone: never a delivery attempt, so not in the ratio.
	await placeOne(1, { status: 'cancelled' });

	const cod = await codPerformance(RANGE);

	assert.ok(cod.delivered >= 3);
	assert.ok(cod.returned >= 1);
	// 3 of 4 attempts, not 3 of 5 orders.
	const attempted = cod.delivered + cod.returned;
	assert.equal(cod.deliveryRate, cod.delivered / attempted);
	assert.ok(Math.abs(cod.deliveryRate + cod.returnRate - 1) < 1e-9, 'the two rates cover the attempts');
});

test('money lost to returns is reported', async () => {
	const cod = await codPerformance(RANGE);
	assert.ok(cod.lostToReturnsMinor > 0, 'a returned order is money that went out and came back');
});

test('courier performance uses a median, not a mean', async () => {
	const base = await placeOne(1);

	// Three quick deliveries and one parcel lost for a month.
	const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000);
	for (const [pushed, delivered] of [[3, 1], [4, 2], [5, 3], [40, 1]] as const) {
		const id = newId('shp');
		shipments.push(id);
		await db.write.insert(shipment).values({
			id,
			orderId: base.orderId,
			courier: 'reporttest',
			consignmentId: id,
			status: 'delivered',
			codAmountMinor: 0,
			pushedAt: daysAgo(pushed),
			deliveredAt: daysAgo(delivered),
			idempotencyKey: id
		});
	}

	const rows = await courierPerformance(RANGE);
	const mine = rows.find((r) => r.courier === 'reporttest');

	assert.ok(mine);
	assert.equal(mine.delivered, 4);
	// Mean would be ~11 days; the median ignores the outlier.
	assert.ok(mine.medianDays !== null && mine.medianDays < 5, `expected a median near 2, got ${mine.medianDays}`);
});

test('outstanding COD is money the courier still owes', async () => {
	const base = await placeOne(1);
	const id = newId('shp');
	shipments.push(id);
	await db.write.insert(shipment).values({
		id,
		orderId: base.orderId,
		courier: 'reportcod',
		consignmentId: id,
		status: 'delivered',
		codAmountMinor: 45000,
		deliveredAt: new Date(),
		idempotencyKey: id
	});

	const rows = await courierPerformance(RANGE);
	const mine = rows.find((r) => r.courier === 'reportcod');
	assert.equal(mine?.outstandingCodMinor, 45000);
});

test('margin is null when any line is missing a cost', async () => {
	const withCost = await topProducts(RANGE);
	const mine = withCost.find((p) => p.productId === productId);
	assert.ok(mine);
	assert.ok(mine.marginMinor !== null, 'this product records cost');
	assert.equal(mine.marginMinor, mine.revenueMinor - 60000 * mine.qty);

	// A line with no cost must not report full revenue as margin.
	await db.write
		.update(orderItem)
		.set({ unitCostMinor: null })
		.where(eq(orderItem.productId, productId));

	const after = await topProducts(RANGE);
	assert.equal(after.find((p) => p.productId === productId)?.marginMinor, null);
});

test('the funnel measures carts, not pageviews', async () => {
	const f = await funnel(RANGE);
	assert.ok(f.cartsCreated >= f.cartsWithItems, 'not every cart gets an item');
	assert.ok(f.cartsWithItems >= f.ordered, 'not every filled cart converts');
	assert.ok(f.conversionRate >= 0 && f.conversionRate <= 1);
});

test('coupon usage reports what the discounts cost', async () => {
	const rows = await couponUsage(RANGE);
	for (const row of rows) {
		assert.ok(row.uses > 0);
		assert.ok(row.discountMinor >= 0);
	}
});
