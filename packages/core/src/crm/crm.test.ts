import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { db, product, order, customer, shippingZone, eq, sql, inArray } from '@fajr/db';
import { createProduct, replaceVariants, getProduct } from '../catalog/index.ts';
import { createCart, addItem } from '../cart/index.ts';
import { place } from '../orders/index.ts';
import { segmentOf, listCustomers, customerProfile, setBlacklisted, isBlacklisted, setNote } from './index.ts';

const days = (n: number) => new Date(Date.now() - n * 86_400_000);
let variantId: string;
let productId: string;
const orders: string[] = [];
const PHONES = ['+8801700000901', '+8801700000902', '+8801700000903'];

before(async () => {
	await db.write.update(shippingZone).set({ isActive: false });
	await db.write
		.insert(shippingZone)
		.values({ id: 'zone_crm_test', name: 'T', districts: [], chargeMinor: 6000, advanceMinor: 0, sort: 0 })
		.onConflictDoNothing();

	productId = await createProduct({ title: 'Test CRM Item', slug: 'test-crm-item', status: 'active' });
	await replaceVariants(productId, [{ priceMinor: 100000, stockOnHand: 500 }]);
	variantId = (await getProduct(productId))!.variants[0]!.id;
});

after(async () => {
	if (orders.length) await db.write.delete(order).where(inArray(order.id, orders));
	await db.write.delete(product).where(eq(product.id, productId));
	await db.write.execute(sql`delete from customer where phone_e164 like '+880170000090%'`);
	await db.write.delete(shippingZone).where(eq(shippingZone.id, 'zone_crm_test'));
	await db.write.update(shippingZone).set({ isActive: true });
	await db.close();
});

async function placeFor(phone: string, opts: { placedAt?: Date; status?: string } = {}) {
	const { id: cartId } = await createCart();
	await addItem(cartId, variantId, 1);
	const result = await place({
		cartId,
		phoneE164: phone,
		name: 'CRM Buyer',
		address: { district: 'Dhaka', detail: 'Road 1' }
	});
	assert.ok(result.ok);
	orders.push(result.orderId);

	if (opts.placedAt || opts.status) {
		await db.write
			.update(order)
			.set({
				...(opts.placedAt ? { placedAt: opts.placedAt } : {}),
				...(opts.status ? { status: opts.status as 'delivered' } : {})
			})
			.where(eq(order.id, result.orderId));
	}
	return result;
}

// ── segmentation ────────────────────────────────────────────────────────────

test('a frequent recent buyer is a champion', () => {
	const s = segmentOf({ recencyDays: 10, frequency: 6, monetaryMinor: 900000 });
	assert.equal(s.segment, 'champion');
	assert.ok(s.action.length > 0, 'a segment must tell staff what to do about it');
});

test('one recent order is new, not at risk', () => {
	assert.equal(segmentOf({ recencyDays: 5, frequency: 1, monetaryMinor: 100000 }).segment, 'new');
});

test('a good customer who stopped is at risk, then lost', () => {
	assert.equal(segmentOf({ recencyDays: 150, frequency: 4, monetaryMinor: 500000 }).segment, 'at_risk');
	assert.equal(segmentOf({ recencyDays: 300, frequency: 4, monetaryMinor: 500000 }).segment, 'lost');
});

test('heavy returns outrank everything else', () => {
	// Recent, frequent and valuable — and still a cost, not a champion.
	const s = segmentOf(
		{ recencyDays: 5, frequency: 8, monetaryMinor: 900000 },
		{ delivered: 2, returned: 6 }
	);
	assert.equal(s.segment, 'problem');
	assert.match(s.action, /advance/i);
});

test('a couple of returns is not a problem customer', () => {
	const s = segmentOf(
		{ recencyDays: 5, frequency: 6, monetaryMinor: 900000 },
		{ delivered: 5, returned: 1 }
	);
	assert.equal(s.segment, 'champion', 'one return in six is normal, not a red flag');
});

test('thin history is not judged', () => {
	// One return out of two orders is 50%, but two orders is not evidence.
	const s = segmentOf({ recencyDays: 5, frequency: 2, monetaryMinor: 200000 }, { delivered: 1, returned: 1 });
	assert.notEqual(s.segment, 'problem');
});

// ── aggregation ─────────────────────────────────────────────────────────────

test('a guest buyer appears without ever creating an account', async () => {
	await placeFor(PHONES[0]!);

	const rows = await listCustomers({ search: PHONES[0]!.slice(-6) });
	const found = rows.find((c) => c.phoneE164 === PHONES[0]);

	assert.ok(found, 'checkout has no account step; the phone is the identity');
	assert.equal(found.orders, 1);
	assert.equal(found.segment, 'new');
});

test('lifetime value sums orders and excludes cancellations', async () => {
	const first = await placeFor(PHONES[1]!);
	const second = await placeFor(PHONES[1]!);
	const cancelled = await placeFor(PHONES[1]!, { status: 'cancelled' });

	const profile = await customerProfile(PHONES[1]!);
	assert.ok(profile);
	assert.equal(profile.orders, 3, 'all three are their orders');
	assert.equal(
		profile.lifetimeMinor,
		first.totalMinor + second.totalMinor,
		'but a cancelled order is not money the shop received'
	);
	assert.equal(profile.history.length, 3, 'and the timeline still shows it');
});

test('recency is measured from the most recent order', async () => {
	await placeFor(PHONES[2]!, { placedAt: days(200) });
	await placeFor(PHONES[2]!, { placedAt: days(3) });

	const profile = await customerProfile(PHONES[2]!);
	assert.ok(profile);
	assert.ok(profile.recencyDays <= 4, `expected ~3 days, got ${profile.recencyDays}`);
	assert.equal(profile.orders, 2);
});

test('an unknown phone has no profile', async () => {
	assert.equal(await customerProfile('+8801700009999'), null);
});

// ── flags ───────────────────────────────────────────────────────────────────

test('blacklisting works for a buyer who never had an account', async () => {
	assert.equal(await isBlacklisted(PHONES[0]!), false);

	await setBlacklisted(PHONES[0]!, true, 'Refused three deliveries');
	assert.equal(await isBlacklisted(PHONES[0]!), true);

	const profile = await customerProfile(PHONES[0]!);
	assert.equal(profile!.isBlacklisted, true);
	assert.equal(profile!.note, 'Refused three deliveries');

	await setBlacklisted(PHONES[0]!, false);
	assert.equal(await isBlacklisted(PHONES[0]!), false, 'and it can be lifted');
});

test('a note survives a later blacklist toggle', async () => {
	await setNote(PHONES[1]!, 'Prefers delivery after 6pm');
	await setBlacklisted(PHONES[1]!, true);

	const profile = await customerProfile(PHONES[1]!);
	assert.equal(profile!.note, 'Prefers delivery after 6pm', 'context staff wrote must not be lost');
	await setBlacklisted(PHONES[1]!, false);
});
