import { test } from 'node:test';
import assert from 'node:assert/strict';
import { productForm, takaToMinor, minorToTaka, bdPhone } from './index.ts';

const base = {
	title: 'Saree',
	variants: [{ key: 'Red / S', price: 2500, stockOnHand: 1 }]
};

test('taka converts to minor units without float drift', () => {
	assert.equal(takaToMinor('2650.50'), 265050);
	assert.equal(takaToMinor('0.1'), 10);
	assert.equal(takaToMinor('1,250'), 125000);
	assert.equal(takaToMinor(19.99), 1999);
	assert.equal(takaToMinor('nonsense'), 0);
	assert.equal(minorToTaka(265050), '2650.50');
});

test('BD phone numbers normalise to E.164', () => {
	for (const input of ['01712345678', '8801712345678', '+8801712345678', '01712-345678']) {
		assert.equal(bdPhone.parse(input), '+8801712345678', input);
	}
	assert.equal(bdPhone.safeParse('12').success, false);
});

test('a draft may have an unpriced variant', () => {
	const result = productForm.safeParse({ ...base, status: 'draft', variants: [{ key: '', price: 0 }] });
	assert.equal(result.success, true, 'drafts are work in progress');
});

test('publishing with a zero-price variant is rejected', () => {
	const result = productForm.safeParse({
		...base,
		status: 'active',
		variants: [
			{ key: 'Red / S', price: 2500 },
			{ key: 'Red / M', price: 0 }
		]
	});
	assert.equal(result.success, false);
	assert.match(result.error!.issues[0]!.message, /Red \/ M/, 'names the offending variant');
});

test('publishing with every price set is accepted', () => {
	assert.equal(productForm.safeParse({ ...base, status: 'active' }).success, true);
});
