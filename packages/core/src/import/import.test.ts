import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { db, product, category, brand, redirect, eq, sql, inArray } from '@fajr/db';
import { getProduct } from '../catalog/index.ts';
import { parseCsv, toSheet, analyse, planImport, applyImport, PRESETS } from './index.ts';

const shopify = PRESETS.find((p) => p.id === 'shopify')!;
const made: string[] = [];

after(async () => {
	await db.write.execute(sql`delete from product where source = 'test-import'`);
	await db.write.execute(sql`delete from redirect where from_path like '/products/test-import-%'`);
	await db.write.execute(sql`delete from category where slug in ('test-sarees-import')`);
	await db.write.execute(sql`delete from brand where slug = 'test-weaver'`);
	await db.close();
});

// ── the parser ──────────────────────────────────────────────────────────────

test('commas inside quoted fields do not split the row', () => {
	const rows = parseCsv('a,b,c\n1,"two, still two",3');
	assert.deepEqual(rows[1], ['1', 'two, still two', '3']);
});

test('escaped quotes and embedded newlines survive', () => {
	const rows = parseCsv('title,body\n"A ""nice"" saree","line one\nline two"');
	assert.equal(rows[1]![0], 'A "nice" saree');
	assert.equal(rows[1]![1], 'line one\nline two');
});

test('a BOM does not corrupt the first header', () => {
	// Excel writes one, and it silently breaks the first column mapping.
	const sheet = toSheet('﻿Handle,Title\nx,Y');
	assert.deepEqual(sheet.headers, ['Handle', 'Title']);
});

test('blank lines are skipped rather than becoming empty products', () => {
	assert.equal(parseCsv('a\n1\n\n\n2\n').length, 3);
});

test('CRLF is one line break, not two', () => {
	assert.equal(parseCsv('a,b\r\n1,2\r\n').length, 2);
});

// ── detection and planning ──────────────────────────────────────────────────

const SHOPIFY_CSV = [
	'Handle,Title,Body (HTML),Vendor,Product Category,Variant SKU,Variant Price,Variant Compare At Price,Cost per item,Variant Inventory Qty,Image Src,Option1 Name,Option1 Value,Option2 Name,Option2 Value,Status',
	'test-import-saree,Red Silk Saree,"Handwoven, with zari",Test Weaver,Apparel > Test Sarees Import,SKU-R-S,4200.00,5200.00,2600.00,4,https://cdn.test/a.jpg,Colour,Red,Size,S,active',
	'test-import-saree,,,,,SKU-R-M,4250.50,5250.00,2600.00,6,https://cdn.test/b.jpg,Colour,Red,Size,M,',
	'test-import-saree,,,,,SKU-M-S,4200.00,,2600.00,0,,Colour,Maroon,Size,S,',
	'test-import-draft,Unpublished Item,,,,SKU-D,1000.00,,,2,,,,,,draft'
].join('\n');

test('a Shopify export is detected from its headers', () => {
	const { preset } = analyse(SHOPIFY_CSV);
	assert.equal(preset?.id, 'shopify');
});

test('variant rows group under the first row of the product', () => {
	const { sheet } = analyse(SHOPIFY_CSV);
	const plan = planImport(sheet, shopify.mapping, 'handle');

	const saree = plan.products.find((p) => p.handle === 'test-import-saree');
	assert.ok(saree);
	assert.equal(saree.title, 'Red Silk Saree', 'the title comes from the first row only');
	assert.equal(saree.variants.length, 3);
	assert.deepEqual(saree.imageUrls, ['https://cdn.test/a.jpg', 'https://cdn.test/b.jpg']);
	assert.deepEqual(
		saree.options.map((o) => `${o.name}: ${o.values.join('/')}`),
		['Colour: Red/Maroon', 'Size: S/M']
	);
});

test('prices become integer minor units', () => {
	const { sheet } = analyse(SHOPIFY_CSV);
	const plan = planImport(sheet, shopify.mapping, 'handle');
	const saree = plan.products.find((p) => p.handle === 'test-import-saree')!;

	assert.equal(saree.variants[0]!.priceMinor, 420000);
	assert.equal(saree.variants[1]!.priceMinor, 425050, '4250.50 must not lose the half taka');
	assert.equal(saree.variants[0]!.compareAtMinor, 520000);
	assert.equal(saree.variants[2]!.compareAtMinor, null, 'an empty compare-at is not zero');
});

test('anything not explicitly published lands as a draft', () => {
	const { sheet } = analyse(SHOPIFY_CSV);
	const plan = planImport(sheet, shopify.mapping, 'handle');

	assert.equal(plan.products.find((p) => p.handle === 'test-import-saree')!.status, 'active');
	// Importing somebody's archived catalog onto a live shop is worse than
	// making them press publish.
	assert.equal(plan.products.find((p) => p.handle === 'test-import-draft')!.status, 'draft');
});

test('a product with no priced row is reported, not imported', () => {
	const csv = [
		'Handle,Title,Variant Price',
		'test-import-noprice,No Price Item,'
	].join('\n');
	const { sheet } = analyse(csv);
	const plan = planImport(sheet, shopify.mapping, 'handle');

	assert.equal(plan.products.length, 0);
	assert.match(plan.errors[0]!.reason, /no row with a price/i);
});

// ── applying ────────────────────────────────────────────────────────────────

test('an import creates products, options and variants', async () => {
	const { sheet } = analyse(SHOPIFY_CSV);
	const plan = planImport(sheet, shopify.mapping, 'handle');
	const result = await applyImport(plan, { source: 'test-import' });

	assert.equal(result.created, 2);
	assert.equal(result.errors.length, 0);

	const row = await db.read.query.product.findFirst({
		where: eq(product.externalId, 'test-import-saree')
	});
	assert.ok(row);
	made.push(row.id);

	const full = (await getProduct(row.id))!;
	assert.equal(full.variants.length, 3);
	assert.equal(full.options.length, 2);
	assert.equal(full.brandId !== null, true, 'the vendor became a brand');
	assert.equal(full.categoryId !== null, true, 'the category leaf was created');
});

test('re-running the same import updates instead of duplicating', async () => {
	const { sheet } = analyse(SHOPIFY_CSV);
	const plan = planImport(sheet, shopify.mapping, 'handle');
	const second = await applyImport(plan, { source: 'test-import' });

	assert.equal(second.created, 0);
	assert.equal(second.updated, 2, 'the second run must not double the catalog');

	const rows = await db.read
		.select({ id: product.id })
		.from(product)
		.where(eq(product.externalId, 'test-import-saree'));
	assert.equal(rows.length, 1);
});

test('a redirect map is written from the old URLs', async () => {
	const { sheet } = analyse(SHOPIFY_CSV);
	const plan = planImport(sheet, shopify.mapping, 'handle');
	await applyImport(plan, { source: 'test-import', oldUrlPattern: '/products/{handle}' });

	const row = await db.read.query.redirect.findFirst({
		where: eq(redirect.fromPath, '/products/test-import-saree')
	});
	// Dropping the old URLs throws away the store's organic traffic on day one.
	assert.ok(row, 'the old product URL must still resolve');
	assert.match(row.toPath, /^\/products\//);
});
