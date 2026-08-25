import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { db, order, fraudCheck, message, sql } from '@fajr/db';
import { scoreRisk, actionFor, assess, ownHistory, THRESHOLDS, type RiskProvider } from './index.ts';
import { sendSms, render, parts, type SmsProvider } from '../notify/index.ts';

const PHONE = '+8801700000123';

after(async () => {
	await db.write.execute(sql`delete from fraud_check where phone_e164 like '+88017000%'`);
	await db.write.execute(sql`delete from message where to_address like '+88017000%'`);
	await db.close();
});

// ── scoring ─────────────────────────────────────────────────────────────────

test('no history anywhere is unknown, not risky', () => {
	const r = scoreRisk({ network: { delivered: 0, returned: 0 } });
	assert.equal(r.band, 'unknown');
	assert.equal(r.score, 0);
	assert.equal(actionFor(r.band), 'verify_call', 'a first-time buyer gets a call, not a rejection');
});

test('a clean history scores low and skips the call', () => {
	const r = scoreRisk({ network: { delivered: 20, returned: 0 } });
	// Not exactly zero: the baseline prior means no finite history is ever proof
	// of perfection. It is well inside `low`, which is what matters.
	assert.ok(r.score < THRESHOLDS.medium, `expected low, got ${r.score}`);
	assert.equal(r.band, 'low');
	assert.equal(actionFor(r.band), 'auto_confirm');
});

test('a heavy returner scores high and must prepay', () => {
	const r = scoreRisk({ network: { delivered: 3, returned: 9 } });
	assert.ok(r.score >= THRESHOLDS.high, `expected high, got ${r.score}`);
	assert.equal(r.band, 'high');
	assert.equal(actionFor(r.band), 'require_advance');
});

test('one return out of one order does not reach the high band', () => {
	// Blocking COD on a single data point is the most common way a rule like
	// this loses a real customer. It should earn a phone call, not a refusal.
	const thin = scoreRisk({ network: { delivered: 0, returned: 1 } });
	const thick = scoreRisk({ network: { delivered: 0, returned: 20 } });

	assert.notEqual(thin.band, 'high', `a single return must not force prepayment, got ${thin.score}`);
	assert.equal(actionFor(thin.band), 'verify_call');
	assert.ok(thick.score > thin.score, 'confidence grows with sample size');
	assert.ok(thick.score >= THRESHOLDS.high, 'twenty straight returns is not ambiguous');
});

test('a clean record is not dragged up by the baseline prior', () => {
	const proven = scoreRisk({ network: { delivered: 40, returned: 0 } });
	assert.equal(proven.band, 'low');
	assert.ok(proven.score < 10, `a long clean history should read as clean, got ${proven.score}`);
});

test('our own good history outweighs a bad network record', () => {
	const networkOnly = scoreRisk({ network: { delivered: 2, returned: 8 } });
	const withOurs = scoreRisk({ network: { delivered: 2, returned: 8 }, own: { delivered: 10, returned: 0 } });

	assert.ok(withOurs.score < networkOnly.score, 'a proven customer of ours is not condemned by the network');
	assert.ok(withOurs.reason.includes('with us'));
});

test('our own bad history is weighted more than the network says', () => {
	const clean = scoreRisk({ network: { delivered: 10, returned: 0 } });
	const burnedUs = scoreRisk({ network: { delivered: 10, returned: 0 }, own: { delivered: 0, returned: 5 } });

	assert.ok(burnedUs.score > clean.score, 'someone who returns on us specifically is our problem');
});

test('the reason is something staff can read out on a call', () => {
	const r = scoreRisk({ network: { delivered: 6, returned: 4 } });
	assert.match(r.reason, /10 past orders/);
	assert.match(r.reason, /40%/);
});

// ── assessment ──────────────────────────────────────────────────────────────

const stubProvider = (delivered: number, returned: number): RiskProvider => ({
	name: 'test-provider',
	async lookup() {
		return { network: { delivered, returned }, raw: { steadfast: { delivered, returned } } };
	}
});

const brokenProvider: RiskProvider = {
	name: 'test-broken',
	async lookup() {
		throw new Error('gateway down');
	}
};

test('a provider outage never blocks a sale', async () => {
	const result = await assess(PHONE, { provider: brokenProvider, force: true });
	assert.equal(result.band, 'unknown');
	assert.equal(result.action, 'verify_call', 'degrade to a human, never to a rejection');
});

test('a real lookup is cached, and the cache is used', async () => {
	await db.write.execute(sql`delete from fraud_check where phone_e164 = ${PHONE}`);

	const first = await assess(PHONE, { provider: stubProvider(2, 8) });
	assert.equal(first.cached, false);
	assert.equal(first.band, 'high');
	assert.deepEqual(first.breakdown, { steadfast: { delivered: 2, returned: 8 } });

	const second = await assess(PHONE, { provider: stubProvider(99, 0) });
	assert.equal(second.cached, true, 'a second lookup inside the window must not call the provider');
	assert.equal(second.band, 'high', 'and must return the cached verdict, not the new numbers');
});

test('an empty answer is not cached', async () => {
	const phone = '+8801700000999';
	await db.write.execute(sql`delete from fraud_check where phone_e164 = ${phone}`);

	await assess(phone, { provider: brokenProvider });
	const rows = await db.read
		.select()
		.from(fraudCheck)
		.where(sql`${fraudCheck.phoneE164} = ${phone}`);

	assert.equal(rows.length, 0, 'caching "we got nothing" would keep returning nothing all week');
});

test('own history counts delivered and returned orders', async () => {
	const stats = await ownHistory('+8801700000456');
	assert.equal(stats.delivered, 0);
	assert.equal(stats.returned, 0);
});

// ── SMS ─────────────────────────────────────────────────────────────────────

test('Bangla is the default and costs more per message', () => {
	const bn = render('order.placed', { store: 'Fajr', code: 'AB12CD', total: '2,060' });
	const en = render('order.placed', { store: 'Fajr', code: 'AB12CD', total: '2,060' }, 'en');

	assert.match(bn, /অর্ডার/);
	assert.match(en, /order AB12CD/);
	assert.ok(parts(bn) >= 1);
	assert.equal(parts('short ascii'), 1);
	assert.ok(parts('ক'.repeat(80)) > 1, 'Bangla gets 70 characters per part, not 160');
});

test('the same notification is never sent twice', async () => {
	const sent: string[] = [];
	const spy: SmsProvider = {
		name: 'spy',
		async send(to, body) {
			sent.push(body);
			return { ok: true, ref: 'x' };
		}
	};

	const input = {
		to: PHONE,
		template: 'order.placed' as const,
		vars: { store: 'Fajr', code: 'DUP123', total: '100' },
		idempotencyKey: 'order:dup-test:placed'
	};

	await db.write.execute(sql`delete from message where idempotency_key = ${input.idempotencyKey}`);

	const first = await sendSms(input, spy);
	const second = await sendSms(input, spy);

	assert.equal(first.duplicate, undefined);
	assert.equal(second.duplicate, true);
	assert.equal(sent.length, 1, 'a retried worker must not spend money twice');
});

test('a failed send is recorded rather than lost', async () => {
	const failing: SmsProvider = {
		name: 'failing',
		async send() {
			return { ok: false, error: 'insufficient balance' };
		}
	};

	const key = 'order:fail-test:placed';
	await db.write.execute(sql`delete from message where idempotency_key = ${key}`);

	const result = await sendSms(
		{ to: PHONE, template: 'order.placed', vars: { store: 'Fajr', code: 'F1', total: '1' }, idempotencyKey: key },
		failing
	);

	assert.equal(result.ok, false);
	const rows = await db.read.select().from(message).where(sql`${message.idempotencyKey} = ${key}`);
	assert.equal(rows[0]?.status, 'failed');
	assert.match(rows[0]!.error!, /balance/, 'the reason must survive for a human to see');
});
