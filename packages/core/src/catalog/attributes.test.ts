import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { db, product, category, eq, sql, inArray } from '@fajr/db';
import { createCategory, createProduct, replaceVariants } from './index.ts';
import { saveAttribute, setProductAttributes, attributesFor, specsFor, facetsFor } from './attributes.ts';
import { browse } from './storefront.ts';

let categoryId: string;
let ram: string;
let cpu: string;
const products: string[] = [];

before(async () => {
	categoryId = await createCategory({ name: 'Test Laptops' });
	ram = await saveAttribute({ categoryId, name: 'RAM', unit: 'GB', sort: 0 });
	cpu = await saveAttribute({ categoryId, name: 'Processor', sort: 1 });

	const specs: [string, string, string][] = [
		['Test Laptop A', '8', 'Core i5'],
		['Test Laptop B', '16', 'Core i5'],
		['Test Laptop C', '16', 'Core i7']
	];

	for (const [title, ramValue, cpuValue] of specs) {
		const id = await createProduct({ title, slug: title.toLowerCase().replace(/ /g, '-'), status: 'active', categoryId });
		products.push(id);
		await replaceVariants(id, [{ priceMinor: 8000000, stockOnHand: 3 }]);
		await setProductAttributes(id, [
			{ attributeId: ram, value: ramValue },
			{ attributeId: cpu, value: cpuValue }
		]);
	}
});

after(async () => {
	if (products.length) await db.write.delete(product).where(inArray(product.id, products));
	await db.write.delete(category).where(eq(category.id, categoryId));
	await db.close();
});

test('attributes belong to a category', async () => {
	const defs = await attributesFor(categoryId);
	assert.deepEqual(defs.map((d) => d.name), ['RAM', 'Processor']);
	assert.equal(defs[0]!.unit, 'GB');
	assert.equal(defs[0]!.code, 'ram', 'the code is derived, not typed');
});

test('the spec table shows what a product actually has', async () => {
	// Laptop B: 16GB, Core i5 — and in the order the merchant defined.
	const specs = await specsFor(products[1]!);
	assert.deepEqual(specs, [
		{ name: 'RAM', unit: 'GB', value: '16' },
		{ name: 'Processor', unit: null, value: 'Core i5' }
	]);
});

test('an empty value is not stored as a blank spec row', async () => {
	await setProductAttributes(products[0]!, [
		{ attributeId: ram, value: '8' },
		{ attributeId: cpu, value: '   ' }
	]);
	const specs = await specsFor(products[0]!);
	assert.equal(specs.length, 1);
	await setProductAttributes(products[0]!, [
		{ attributeId: ram, value: '8' },
		{ attributeId: cpu, value: 'Core i5' }
	]);
});

test('facets are counted from products in the category', async () => {
	const facets = await facetsFor(categoryId);
	const ramFacet = facets.find((f) => f.name === 'RAM')!;

	assert.ok(ramFacet);
	const sixteen = ramFacet.values.find((v) => v.value === '16')!;
	// A filter offering "16GB (0)" is worse than no filter at all.
	assert.equal(sixteen.count, 2);
	assert.equal(ramFacet.values.find((v) => v.value === '8')!.count, 1);
});

test('selecting a facet narrows the listing', async () => {
	const all = await browse({ categoryId });
	assert.equal(all.total, 3);

	const filtered = await browse({ categoryId, facets: { [ram]: ['16'] } });
	assert.equal(filtered.total, 2);
});

test('two facets are ANDed, values within one are ORed', async () => {
	const both = await browse({ categoryId, facets: { [ram]: ['16'], [cpu]: ['Core i7'] } });
	assert.equal(both.total, 1, 'AND across attributes');

	const either = await browse({ categoryId, facets: { [ram]: ['8', '16'] } });
	assert.equal(either.total, 3, 'OR within one attribute');
});

test('a facet nothing matches returns nothing, not everything', async () => {
	// The usual way a filter silently stops filtering.
	const none = await browse({ categoryId, facets: { [ram]: ['999'] } });
	assert.equal(none.total, 0);
	assert.equal(none.items.length, 0);
});
