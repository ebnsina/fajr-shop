import { test } from 'node:test';
import assert from 'node:assert/strict';
import { phoneFor, countryOf, areasOf, checkoutFormFor } from './index.ts';

test('a Bangladeshi number normalises from every form it is typed in', () => {
	const bd = phoneFor('BD');
	for (const raw of ['01712345678', '8801712345678', '+8801712345678', '017 1234 5678']) {
		assert.equal(bd.parse(raw), '+8801712345678', raw);
	}
});

// The bug this exists to prevent: a Dubai customer could not check out at all,
// because every phone was validated as Bangladeshi.
test('a UAE number is accepted by a UAE shop and refused by a BD one', () => {
	assert.equal(phoneFor('AE').parse('0501234567'), '+971501234567');
	assert.equal(phoneFor('AE').parse('+971501234567'), '+971501234567');
	assert.equal(phoneFor('BD').safeParse('0501234567').success, false);
});

test('Saudi, Kuwait and Oman each normalise to their own dial code', () => {
	assert.equal(phoneFor('SA').parse('0501234567'), '+966501234567');
	assert.equal(phoneFor('KW').parse('51234567'), '+96551234567');
	assert.equal(phoneFor('OM').parse('92123456'), '+96892123456');
});

test('an unknown country falls back to Bangladesh rather than throwing', () => {
	assert.equal(countryOf('ZZ').code, 'BD');
	assert.equal(countryOf(null).code, 'BD');
});

test('a UAE shop offers emirates, never Bangladeshi districts', () => {
	const emirates = areasOf('AE');
	assert.ok(emirates.includes('Dubai'));
	assert.equal(emirates.includes('Gazipur'), false);

	const districts = areasOf('BD');
	assert.ok(districts.includes('Gazipur'));
	assert.equal(districts.includes('Dubai'), false);
});

test('the address label follows the country', () => {
	assert.equal(countryOf('BD').areaLabel, 'District');
	assert.equal(countryOf('AE').areaLabel, 'Emirate');
	assert.equal(countryOf('SA').areaLabel, 'Region');
});

test('the advance-payment option is named for the market', () => {
	assert.equal(countryOf('BD').manualPayLabel, 'bKash');
	assert.equal(countryOf('AE').manualPayLabel, 'Bank transfer');
});

test('the Gulf defaults to tax-inclusive display, South Asia does not', () => {
	assert.equal(countryOf('AE').taxInclusiveByDefault, true);
	assert.equal(countryOf('AE').taxRateBp, 500);
	assert.equal(countryOf('BD').taxInclusiveByDefault, false);
});

test('the checkout form validates against its own country', () => {
	const uae = checkoutFormFor('AE');
	const parsed = uae.safeParse({
		name: 'Omar Al Balushi',
		phone: '0501234567',
		district: 'Dubai',
		detail: 'Villa 12, Street 4'
	});
	assert.equal(parsed.success, true, JSON.stringify(parsed.error?.issues));
	assert.equal(parsed.data?.phone, '+971501234567');

	assert.equal(checkoutFormFor('BD').safeParse({
		name: 'Omar', phone: '0501234567', district: 'Dubai', detail: 'Villa 12'
	}).success, false, 'a BD shop must not silently accept a UAE number');
});
