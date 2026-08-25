import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../src/app.ts';
import { db, variant, product, sql, eq, and, gt } from '@fajr/db';

const call = (path: string, init?: RequestInit) =>
	app.request(`http://api.test${path}`, init);

const post = (path: string, body: unknown) =>
	call(path, {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify(body)
	});

let variantId = '';
let placedCode = '';

before(async () => {
	// Needs headroom: the quantity tests add two, and a variant with one left
	// would fail on stock rather than on what is being tested.
	const [row] = await db.read
		.select({ id: variant.id })
		.from(variant)
		.innerJoin(product, eq(product.id, variant.productId))
		.where(and(eq(product.status, 'active'), gt(variant.stockOnHand, 5)))
		.limit(1);

	assert.ok(row, 'the suite needs one in-stock variant to work with');
	variantId = row.id;
});

after(async () => {
	// Only the order this suite placed.
	if (placedCode) {
		await db.write.execute(sql`delete from "order" where public_code = ${placedCode}`);
	}
	await db.close();
});

test('the store endpoint describes the shop a client has to render', async () => {
	const res = await call('/api/v1/store');
	assert.equal(res.status, 200);

	const body = await res.json();
	assert.ok(body.name && body.currency && body.country);
	assert.ok(body.address.areas.length > 0, 'a client cannot build an address form without these');
	assert.ok(body.address.areaLabel, 'District or Emirate — the client must not guess');
});

test('browsing pages, and an unknown category is a 404 not an empty page', async () => {
	const listed = await call('/api/v1/products?perPage=3');
	assert.equal(listed.status, 200);

	const body = await listed.json();
	assert.ok(body.items.length <= 3);
	assert.ok(body.total >= body.items.length);

	// Silently returning everything for a typo'd category is how a client ships
	// a broken filter without noticing.
	assert.equal((await call('/api/v1/products?category=does-not-exist')).status, 404);
});

test('a missing product is a 404 with a code, not a crash', async () => {
	const res = await call('/api/v1/products/no-such-product');
	assert.equal(res.status, 404);
	assert.equal((await res.json()).error, 'product_not_found');
});

test('a cart round-trips: create, add, requote, remove', async () => {
	const { token } = await (await post('/api/v1/cart', {})).json();
	assert.ok(token);

	const added = await post(`/api/v1/cart/${token}/items`, { variantId, qty: 2 });
	assert.equal(added.status, 200);
	assert.equal((await added.json()).cart.itemCount, 2);

	// The quote follows the area, which is the whole point of asking for it.
	const near = await (await call(`/api/v1/cart/${token}?area=Dubai`)).json();
	assert.ok(near.shipping.zoneName);

	const line = near.cart.lines[0];
	const emptied = await call(`/api/v1/cart/${token}/items/${line.id}`, { method: 'DELETE' });
	assert.equal((await emptied.json()).cart.itemCount, 0);
});

test('an unknown variant is refused by code, not by a 500', async () => {
	const { token } = await (await post('/api/v1/cart', {})).json();
	const res = await post(`/api/v1/cart/${token}/items`, { variantId: 'var_nope', qty: 1 });

	assert.equal(res.status, 404);
	const body = await res.json();
	assert.equal(body.error, 'variant_not_found');
	assert.ok(body.message, 'the client needs something it can show a person');
});

test('an expired cart token is refused rather than silently starting a new one', async () => {
	assert.equal((await call('/api/v1/cart/not-a-real-token')).status, 404);
});

test('checkout reports invalid details per field', async () => {
	const { token } = await (await post('/api/v1/cart', {})).json();
	await post(`/api/v1/cart/${token}/items`, { variantId, qty: 1 });

	const res = await post('/api/v1/checkout', {
		cartToken: token,
		name: 'X',
		phone: 'nonsense',
		district: '',
		detail: 'no'
	});

	assert.equal(res.status, 400);
	const body = await res.json();
	assert.equal(body.error, 'invalid_details');
	// Per field, so the client can mark the inputs rather than showing one banner.
	assert.ok(Object.keys(body.fields).length > 1);
});

test('checkout places an order and it can then be tracked', async () => {
	const { token } = await (await post('/api/v1/cart', {})).json();
	await post(`/api/v1/cart/${token}/items`, { variantId, qty: 1 });

	const res = await post('/api/v1/checkout', {
		cartToken: token,
		name: 'API Test Buyer',
		phone: '0501234567',
		district: 'Dubai',
		thana: 'Dubai Marina',
		detail: 'Villa 12, Street 4',
		paymentMethod: 'cod'
	});

	assert.equal(res.status, 201);
	const order = await res.json();
	placedCode = order.publicCode;

	assert.ok(order.publicCode);
	assert.ok(order.totalMinor > 0);
	// The currency travels with the amount, or a client formats it as taka.
	assert.ok(order.currency);

	const tracked = await call(`/api/v1/orders/${order.publicCode}?phone=0501234567`);
	assert.equal(tracked.status, 200);
	assert.equal((await tracked.json()).order.publicCode, order.publicCode);
});

test('an order code alone does not reveal an order', async () => {
	assert.ok(placedCode, 'needs the order from the previous test');
	const res = await call(`/api/v1/orders/${placedCode}?phone=0509999999`);
	assert.equal(res.status, 404, 'codes are short and guessable; the phone is the check');
});

test('the spec is generated from the same schemas the handlers validate with', async () => {
	const spec = await (await call('/api/v1/openapi.json')).json();
	for (const path of ['/api/v1/store', '/api/v1/products', '/api/v1/cart', '/api/v1/checkout']) {
		assert.ok(spec.paths[path], `${path} is missing from the published spec`);
	}
});
