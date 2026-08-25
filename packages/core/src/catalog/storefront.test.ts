import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { db, product, category, eq, sql } from '@fajr/db';
import {
	createCategory, createProduct, replaceVariants, reserveStock, getProduct,
	browse, productPage, navCategories, findRedirect, updateProduct
} from './index.ts';

let catId: string;
const ids: string[] = [];

before(async () => {
	catId = await createCategory({ name: 'Test Shop Cat' });
	const cheap = await createProduct({ title: 'Test Cheap Kurti', slug: 'test-cheap-kurti', status: 'active', categoryId: catId });
	const pricey = await createProduct({ title: 'Test Pricey Saree', slug: 'test-pricey-saree', status: 'active', categoryId: catId });
	const hidden = await createProduct({ title: 'Test Draft Item', slug: 'test-draft-item', status: 'draft', categoryId: catId });
	ids.push(cheap, pricey, hidden);

	await replaceVariants(cheap, [{ priceMinor: 90000, compareAtMinor: 120000, stockOnHand: 5 }]);
	await replaceVariants(pricey, [
		{ priceMinor: 450000, stockOnHand: 2 },
		{ priceMinor: 520000, stockOnHand: 0 }
	]);
	await replaceVariants(hidden, [{ priceMinor: 10000, stockOnHand: 5 }]);
});

after(async () => {
	for (const id of ids) await db.write.delete(product).where(eq(product.id, id));
	await db.write.delete(category).where(eq(category.id, catId));
	await db.write.execute(sql`delete from redirect where from_path like '/products/test-%' or to_path like '/products/test-%'`);
	await db.close();
});

test('browse shows only active products', async () => {
	const { items } = await browse({ categoryId: catId });
	const slugs = items.map((i) => i.slug);
	assert.ok(slugs.includes('test-cheap-kurti'));
	assert.ok(slugs.includes('test-pricey-saree'));
	assert.ok(!slugs.includes('test-draft-item'), 'a draft must never reach the storefront');
});

test('a card shows the lowest variant price', async () => {
	const { items } = await browse({ categoryId: catId });
	const pricey = items.find((i) => i.slug === 'test-pricey-saree')!;
	assert.equal(pricey.priceMinor, 450000, 'shows "from" price, not the highest');
});

test('compare-at only counts when it is above the price', async () => {
	const { items } = await browse({ categoryId: catId });
	assert.equal(items.find((i) => i.slug === 'test-cheap-kurti')!.compareAtMinor, 120000);
	assert.equal(items.find((i) => i.slug === 'test-pricey-saree')!.compareAtMinor, null);
});

test('a product is in stock if any variant is', async () => {
	const { items } = await browse({ categoryId: catId });
	assert.equal(items.find((i) => i.slug === 'test-pricey-saree')!.inStock, true, 'one variant has stock');
});

test('reserved stock makes a product sold out', async () => {
	const p = (await getProduct(ids[0]!))!;
	await reserveStock(p.variants[0]!.id, 5);

	const { items } = await browse({ categoryId: catId });
	assert.equal(items.find((i) => i.slug === 'test-cheap-kurti')!.inStock, false, 'held stock is not available stock');

	const filtered = await browse({ categoryId: catId, inStockOnly: true });
	assert.ok(!filtered.items.some((i) => i.slug === 'test-cheap-kurti'));
});

test('sorting by price works in both directions', async () => {
	const asc = await browse({ categoryId: catId, sort: 'price-asc' });
	const desc = await browse({ categoryId: catId, sort: 'price-desc' });
	assert.equal(asc.items[0]!.slug, 'test-cheap-kurti');
	assert.equal(desc.items[0]!.slug, 'test-pricey-saree');
});

test('paging reports totals', async () => {
	const first = await browse({ categoryId: catId, perPage: 1 });
	assert.equal(first.items.length, 1);
	assert.equal(first.total, 2);
	assert.equal(first.pages, 2);
});

test('a draft product has no product page', async () => {
	assert.equal(await productPage('test-draft-item'), null);
});

test('the product page carries options, variants and their links', async () => {
	const detail = await productPage('test-pricey-saree');
	assert.ok(detail);
	assert.equal(detail.variants.length, 2);
	assert.equal(detail.category?.slug, (await db.read.query.category.findFirst({ where: eq(category.id, catId) }))!.slug);
});

test('a renamed product redirects from its old path', async () => {
	await updateProduct(ids[1]!, { slug: 'test-pricey-saree-2026' });
	const hit = await findRedirect('/products/test-pricey-saree');
	assert.equal(hit?.to, '/products/test-pricey-saree-2026');
	assert.equal(hit?.status, 301);
	assert.equal(await findRedirect('/products/never-existed'), null);
});

test('a redirect to a Bangla slug is percent-encoded for the Location header', async () => {
	const id = await createProduct({ title: 'Test Bangla Rename', slug: 'test-bangla-old', status: 'active' });
	ids.push(id);
	await replaceVariants(id, [{ priceMinor: 100000, stockOnHand: 1 }]);
	await updateProduct(id, { slug: 'test-লাল-শাড়ি' });

	const hit = await findRedirect('/products/test-bangla-old');
	assert.ok(hit);
	// An HTTP Location header must be ASCII, or SvelteKit throws a 500.
	assert.ok(!/[^\x00-\x7F]/.test(hit.to), `Location must be ASCII, got ${hit.to}`);
	assert.equal(decodeURI(hit.to), '/products/test-লাল-শাড়ি', 'and must decode back to the real path');
});

test('nav lists only top-level categories', async () => {
	const child = await createCategory({ name: 'Test Nested Child', parentId: catId });
	const nav = await navCategories();
	assert.ok(nav.some((c) => c.id === catId));
	assert.ok(!nav.some((c) => c.id === child), 'children belong in a submenu, not the top bar');
	await db.write.delete(category).where(eq(category.id, child));
});
