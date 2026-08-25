import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { db, category, product, variant, redirect, eq, sql, inArray } from '@fajr/db';
import {
	createCategory, moveCategory, categoryTree, ancestorsOf, descendantIds, deleteCategory,
	createProduct, updateProduct, listProducts, getProduct, replaceVariants,
	reserveStock, releaseStock, commitStock, slugify
} from './index.ts';

const made: string[] = [];
const madeProducts: string[] = [];

const cat = async (name: string, parentId?: string) => {
	const id = await createCategory({ name, parentId });
	made.push(id);
	return id;
};

/** Track every product so teardown deletes exactly what this suite created —
 *  a `like 'test-%'` sweep reaches into other suites' fixtures. */
const makeProduct = async (...args: Parameters<typeof createProduct>) => {
	const id = await createProduct(...args);
	madeProducts.push(id);
	return id;
};

after(async () => {
	if (madeProducts.length) await db.write.delete(product).where(inArray(product.id, madeProducts));
	for (const id of made.reverse()) await db.write.delete(category).where(eq(category.id, id));
	await db.write.delete(redirect).where(sql`${redirect.fromPath} like '/products/test-%'`);
	await db.close();
});

test('slugify keeps Bangla and collapses punctuation', () => {
	assert.equal(slugify('Red Silk Saree!'), 'red-silk-saree');
	assert.equal(slugify('লাল সিল্ক শাড়ি'), 'লাল-সিল্ক-শাড়ি');
	assert.equal(slugify('  Café  Latté  '), 'cafe-latte');
	assert.equal(slugify('!!!'), '');
});

test('a slug collision gets suffixed', async () => {
	const a = await makeProduct({ title: 'Test Collide', slug: 'test-collide' });
	const b = await makeProduct({ title: 'Test Collide', slug: 'test-collide' });
	assert.equal((await getProduct(a))!.slug, 'test-collide');
	assert.equal((await getProduct(b))!.slug, 'test-collide-2');
});

test('paths and depths build down the tree', async () => {
	const root = await cat('Test Women');
	const mid = await cat('Test Saree', root);
	const leaf = await cat('Test Jamdani', mid);

	const rows = await db.read.select().from(category).where(inArray(category.id, [root, mid, leaf]));
	const byId = Object.fromEntries(rows.map((r) => [r.id, r]));

	assert.equal(byId[root]!.path, `/${root}/`);
	assert.equal(byId[mid]!.path, `/${root}/${mid}/`);
	assert.equal(byId[leaf]!.path, `/${root}/${mid}/${leaf}/`);
	assert.deepEqual([byId[root]!.depth, byId[mid]!.depth, byId[leaf]!.depth], [0, 1, 2]);

	assert.deepEqual((await ancestorsOf(leaf)).map((c) => c.id), [root, mid]);
	assert.deepEqual((await descendantIds(root)).sort(), [root, mid, leaf].sort());
});

test('moving a branch rewrites every descendant path in one update', async () => {
	const a = await cat('Test A');
	const b = await cat('Test B');
	const child = await cat('Test Child', a);
	const grandchild = await cat('Test Grandchild', child);

	await moveCategory(child, b);

	const rows = await db.read.select().from(category).where(inArray(category.id, [child, grandchild]));
	const byId = Object.fromEntries(rows.map((r) => [r.id, r]));

	assert.equal(byId[child]!.path, `/${b}/${child}/`);
	assert.equal(byId[grandchild]!.path, `/${b}/${child}/${grandchild}/`, 'grandchild must move with its parent');
	assert.equal(byId[child]!.depth, 1);
	assert.equal(byId[grandchild]!.depth, 2);
	assert.equal(byId[child]!.parentId, b);
});

test('a category cannot be moved inside itself', async () => {
	const parent = await cat('Test Cycle Parent');
	const child = await cat('Test Cycle Child', parent);
	await assert.rejects(() => moveCategory(parent, child), /own descendant/);
});

test('moving to root resets depth', async () => {
	const parent = await cat('Test Root Parent');
	const child = await cat('Test Root Child', parent);
	await moveCategory(child, null);
	const row = await db.read.query.category.findFirst({ where: eq(category.id, child) });
	assert.equal(row!.depth, 0);
	assert.equal(row!.path, `/${child}/`);
	assert.equal(row!.parentId, null);
});

test('deleting a category orphans products instead of deleting them', async () => {
	const doomed = await cat('Test Doomed');
	const id = await makeProduct({ title: 'Test Survivor', slug: 'test-survivor', categoryId: doomed });

	await deleteCategory(doomed);
	made.splice(made.indexOf(doomed), 1);

	const survivor = await getProduct(id);
	assert.ok(survivor, 'product must survive its category');
	assert.equal(survivor.categoryId, null);
});

test('changing a slug leaves a redirect behind', async () => {
	const id = await makeProduct({ title: 'Test Renamed', slug: 'test-renamed-old' });
	await updateProduct(id, { slug: 'test-renamed-new' });

	const row = await db.read.query.redirect.findFirst({
		where: eq(redirect.fromPath, '/products/test-renamed-old')
	});
	assert.equal(row?.toPath, '/products/test-renamed-new');
	assert.equal(row?.statusCode, 301);
});

test('listing rolls up price and stock without an N+1', async () => {
	const id = await makeProduct({ title: 'Test Rollup', slug: 'test-rollup', status: 'active' });
	await replaceVariants(id, [
		{ priceMinor: 250000, stockOnHand: 3 },
		{ priceMinor: 180000, stockOnHand: 5 }
	]);

	const { rows } = await listProducts({ search: 'Test Rollup' });
	const found = rows.find((r) => r.id === id);
	assert.equal(found?.priceMinor, 180000, 'shows the lowest variant price');
	assert.equal(Number(found?.stock), 8);
	assert.equal(Number(found?.variantCount), 2);
});

test('reserving stock is atomic and refuses to oversell', async () => {
	const id = await makeProduct({ title: 'Test Flash', slug: 'test-flash', status: 'active' });
	await replaceVariants(id, [{ priceMinor: 100000, stockOnHand: 50 }]);
	const v = (await getProduct(id))!.variants[0]!;

	// 200 buyers race for 50 units, two at a time.
	const results = await Promise.all(Array.from({ length: 200 }, () => reserveStock(v.id, 2)));
	const won = results.filter((r) => r.ok).length;

	assert.equal(won, 25, 'exactly 25 reservations of 2 fit in 50 units');

	const row = await db.read.query.variant.findFirst({ where: eq(variant.id, v.id) });
	assert.equal(row!.stockReserved, 50);
	assert.equal(row!.stockOnHand, 50, 'on-hand does not move until dispatch');
});

test('release returns stock, commit removes it', async () => {
	const id = await makeProduct({ title: 'Test Ledger', slug: 'test-ledger' });
	await replaceVariants(id, [{ priceMinor: 100000, stockOnHand: 10 }]);
	const v = (await getProduct(id))!.variants[0]!;

	assert.equal((await reserveStock(v.id, 4)).ok, true);
	await releaseStock(v.id, 1);
	await commitStock(v.id, 3);

	const row = await db.read.query.variant.findFirst({ where: eq(variant.id, v.id) });
	assert.equal(row!.stockOnHand, 7, 'three shipped');
	assert.equal(row!.stockReserved, 0, 'nothing still held');
});

test('backorder variants ignore the stock ceiling', async () => {
	const id = await makeProduct({ title: 'Test Backorder', slug: 'test-backorder' });
	await replaceVariants(id, [{ priceMinor: 50000, stockOnHand: 0, allowBackorder: true }]);
	const v = (await getProduct(id))!.variants[0]!;
	assert.equal((await reserveStock(v.id, 99)).ok, true);
});

test('a tree comes back nested', async () => {
	const root = await cat('Test Tree Root');
	const child = await cat('Test Tree Child', root);
	const tree = await categoryTree();
	const node = tree.find((n) => n.id === root);
	assert.equal(node?.children.length, 1);
	assert.equal(node?.children[0]?.id, child);
});
