import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { db, product, review, question, newId, sql } from '@fajr/db';
import {
	submitReview, publishedReviews, ratingSummary, ratingsFor,
	moderateReview, askQuestion, publishedQuestions, answerQuestion
} from './index.ts';

const PRODUCT = 'prd_social_test';
const PHONE = '+8801700000901';

// Only rows this suite created, never a LIKE sweep across the shared database.
after(async () => {
	await db.write.execute(sql`delete from review where product_id = ${PRODUCT}`);
	await db.write.execute(sql`delete from question where product_id = ${PRODUCT}`);
	await db.write.execute(sql`delete from product where id = ${PRODUCT}`);
	await db.close();
});

await db.write
	.insert(product)
	.values({ id: PRODUCT, title: 'Social Test Product', slug: `social-test-${newId('x')}`, status: 'active' })
	.onConflictDoNothing();

test('a rating outside one to five is refused', async () => {
	for (const rating of [0, 6, 2.5, -1]) {
		const result = await submitReview({
			productId: PRODUCT,
			rating,
			body: 'This body is definitely long enough to pass.',
			authorName: 'Tester',
			authorPhone: PHONE
		});
		assert.equal(result.ok, false, `${rating} should not be accepted`);
	}
});

test('a one-word review is refused', async () => {
	const result = await submitReview({
		productId: PRODUCT,
		rating: 5,
		body: 'good',
		authorName: 'Tester',
		authorPhone: PHONE
	});
	assert.equal(result.ok, false);
});

test('a new review is held for moderation, not published', async () => {
	const result = await submitReview({
		productId: PRODUCT,
		rating: 4,
		body: 'A perfectly reasonable review body goes here.',
		authorName: 'Tester',
		authorPhone: PHONE
	});
	assert.equal(result.ok, true);
	assert.deepEqual(await publishedReviews(PRODUCT), [], 'nothing public until approved');
});

test('a second review from the same phone edits the first', async () => {
	await submitReview({
		productId: PRODUCT,
		rating: 2,
		body: 'Changed my mind after a week of using it.',
		authorName: 'Tester',
		authorPhone: PHONE
	});

	const rows = await db.read.select().from(review).where(sql`product_id = ${PRODUCT}`);
	assert.equal(rows.length, 1, 'one row per person per product');
	assert.equal(rows[0]!.rating, 2);
});

test('the summary counts only published reviews, and averages them', async () => {
	const rows = await db.read.select().from(review).where(sql`product_id = ${PRODUCT}`);
	await moderateReview(rows[0]!.id, 'published');

	for (const [rating, phone] of [[5, '+8801700000902'], [3, '+8801700000903']] as const) {
		await submitReview({
			productId: PRODUCT,
			rating,
			body: 'Another entirely reasonable review body.',
			authorName: 'Tester',
			authorPhone: phone
		});
	}

	// Still only the one published: the two new ones are pending.
	let summary = await ratingSummary(PRODUCT);
	assert.equal(summary.count, 1);
	assert.equal(summary.average, 2);

	const all = await db.read.select().from(review).where(sql`product_id = ${PRODUCT}`);
	for (const row of all) await moderateReview(row.id, 'published');

	summary = await ratingSummary(PRODUCT);
	assert.equal(summary.count, 3);
	// (2 + 5 + 3) / 3
	assert.equal(summary.average, 3.3);
	assert.equal(summary.breakdown[1], 1, 'one two-star');
	assert.equal(summary.breakdown[4], 1, 'one five-star');
});

test('bulk ratings answer for a whole grid in one call', async () => {
	const map = await ratingsFor([PRODUCT, 'prd_does_not_exist']);
	assert.equal(map.get(PRODUCT)?.count, 3);
	assert.equal(map.has('prd_does_not_exist'), false);
});

test('a rejected review disappears from the public list', async () => {
	const rows = await db.read.select().from(review).where(sql`product_id = ${PRODUCT}`);
	await moderateReview(rows[0]!.id, 'rejected');

	const publicRows = await publishedReviews(PRODUCT);
	assert.equal(publicRows.length, 2);
	assert.equal(publicRows.some((r) => r.id === rows[0]!.id), false);
});

test('an unanswered question stays private, and answering publishes it', async () => {
	const asked = await askQuestion({
		productId: PRODUCT,
		body: 'Does this come in another colour?',
		askedName: 'Asker',
		askedPhone: PHONE
	});
	assert.equal(asked.ok, true);
	assert.deepEqual(await publishedQuestions(PRODUCT), [], 'no answer, no publication');

	const [row] = await db.read.select().from(question).where(sql`product_id = ${PRODUCT}`);
	await answerQuestion(row!.id, 'Yes, in three colours.');

	const publicQuestions = await publishedQuestions(PRODUCT);
	assert.equal(publicQuestions.length, 1);
	assert.equal(publicQuestions[0]!.answer, 'Yes, in three colours.');
});

test('an empty answer does not publish the question', async () => {
	const [row] = await db.read.select().from(question).where(sql`product_id = ${PRODUCT}`);
	await answerQuestion(row!.id, '   ');

	assert.deepEqual(await publishedQuestions(PRODUCT), [], 'blank answers publish nothing');
});
