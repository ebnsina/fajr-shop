import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { db, product, page, eq, sql, inArray } from '@fajr/db';
import { createProduct, replaceVariants, getProduct } from '../catalog/index.ts';
import { createPage, updatePage } from '../cms/index.ts';
import { sitemapEntries, feedItems } from './index.ts';

const ORIGIN = 'https://shop.test';
const made: string[] = [];
const pages: string[] = [];

before(async () => {
	const live = await createProduct({ title: 'Test SEO Live', slug: 'test-seo-live', status: 'active', summary: 'A live one' });
	const draft = await createProduct({ title: 'Test SEO Draft', slug: 'test-seo-draft', status: 'draft' });
	made.push(live, draft);

	await replaceVariants(live, [
		{ priceMinor: 120000, compareAtMinor: 150000, stockOnHand: 3 },
		{ priceMinor: 90000, stockOnHand: 0 }
	]);
	await replaceVariants(draft, [{ priceMinor: 50000, stockOnHand: 5 }]);

	const p = await createPage({ title: 'Test SEO Page' });
	pages.push(p);
	await updatePage(p, { status: 'published' });
});

after(async () => {
	if (made.length) await db.write.delete(product).where(inArray(product.id, made));
	if (pages.length) await db.write.delete(page).where(inArray(page.id, pages));
	await db.close();
});

test('the sitemap lists live products and skips drafts', async () => {
	const entries = await sitemapEntries(ORIGIN);
	const locs = entries.map((e) => e.loc);

	assert.ok(locs.includes(`${ORIGIN}/products/test-seo-live`));
	assert.ok(!locs.some((l) => l.includes('test-seo-draft')), 'a draft must never reach a crawler');
	assert.equal(locs[0], ORIGIN, 'the home page comes first');
});

test('sitemap URLs are ASCII, so the XML is valid', async () => {
	const id = await createProduct({ title: 'Test Bangla SEO', slug: 'test-লাল-শাড়ি', status: 'active' });
	made.push(id);
	await replaceVariants(id, [{ priceMinor: 100000, stockOnHand: 1 }]);

	const entries = await sitemapEntries(ORIGIN);
	const found = entries.find((e) => e.loc.includes('test-'));
	assert.ok(entries.every((e) => !/[^\x00-\x7F]/.test(e.loc)), 'a raw Bangla slug would be invalid in XML');
	assert.ok(found);
});

test('an unpublished page is not in the sitemap', async () => {
	const p = await createPage({ title: 'Test Unpublished' });
	pages.push(p);

	const entries = await sitemapEntries(ORIGIN);
	assert.ok(!entries.some((e) => e.loc.includes('test-unpublished')));
});

test('the feed has one row per variant, grouped by product', async () => {
	const items = await feedItems(ORIGIN);
	const mine = items.filter((i) => i.link.includes('test-seo-live'));

	assert.equal(mine.length, 2, 'a shopper clicking the red one should land on the red one');
	assert.equal(new Set(mine.map((i) => i.itemGroupId)).size, 1, 'variants of one product share a group');
});

test('a markdown becomes price plus sale_price, not a lower price', async () => {
	const items = await feedItems(ORIGIN);
	const discounted = items.find((i) => i.link.includes('test-seo-live') && i.salePriceMinor !== null);

	assert.ok(discounted, 'the discounted variant should be in the feed');
	// The platforms show a strikethrough only when both are present this way.
	assert.equal(discounted.priceMinor, 150000, 'price is the original');
	assert.equal(discounted.salePriceMinor, 120000, 'sale_price is what we charge');
});

test('availability reflects real stock', async () => {
	const items = await feedItems(ORIGIN);
	const mine = items.filter((i) => i.link.includes('test-seo-live'));

	assert.ok(mine.some((i) => i.availability === 'in stock'));
	assert.ok(mine.some((i) => i.availability === 'out of stock'), 'a sold-out variant must say so');
});

test('draft products stay out of the feed', async () => {
	const items = await feedItems(ORIGIN);
	assert.ok(!items.some((i) => i.link.includes('test-seo-draft')));
});

test('every feed item has the fields the platforms reject without', async () => {
	const items = await feedItems(ORIGIN);
	for (const item of items) {
		assert.ok(item.id, 'id is required');
		assert.ok(item.title, 'title is required');
		assert.ok(item.description, 'an empty description is rejected on import');
		assert.match(item.link, /^https?:\/\//);
	}
});
