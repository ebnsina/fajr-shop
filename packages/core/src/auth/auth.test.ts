import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { db, session, otp, rateLimit, newId, eq, sql } from '@fajr/db';
import { issueSession, verifySession, revokeSession, revokeAllSessions, SESSION_TTL_MS } from './session.ts';
import { createOtp, verifyOtp, SEND_LIMIT_PER_PHONE } from './otp.ts';
import { hashToken } from './token.ts';

const PHONE = '+8801700000001';
const USER = newId('u');

before(async () => {
	await db.write.delete(otp).where(eq(otp.phoneE164, PHONE));
	await db.write.delete(rateLimit).where(sql`${rateLimit.key} like ${'otp:send:%' + PHONE}`);
	await revokeAllSessions(USER, 'customer');
});

after(async () => {
	await revokeAllSessions(USER, 'customer');
	await db.write.delete(otp).where(eq(otp.phoneE164, PHONE));
	await db.write.delete(rateLimit).where(sql`${rateLimit.key} like ${'otp:send:%' + PHONE}`);
	await db.close();
});

test('a valid session resolves to its user', async () => {
	const { token } = await issueSession(USER, 'customer');
	const found = await verifySession(token);
	assert.equal(found?.userId, USER);
	assert.equal(found?.userType, 'customer');
	await revokeSession(token);
});

test('a tampered token is rejected', async () => {
	const { token } = await issueSession(USER, 'customer');
	assert.equal(await verifySession(token.slice(0, -1) + 'x'), null);
	assert.equal(await verifySession('not-a-real-token'), null);
	assert.equal(await verifySession(undefined), null);
	await revokeSession(token);
});

test('the raw token is never stored', async () => {
	const { token } = await issueSession(USER, 'customer');
	const row = await db.read.query.session.findFirst({ where: eq(session.id, hashToken(token)) });
	assert.ok(row, 'session should exist under the hash');
	assert.notEqual(row.id, token);
	await revokeSession(token);
});

test('an expired session is rejected and cleaned up', async () => {
	const { token } = await issueSession(USER, 'customer');
	await db.write
		.update(session)
		.set({ expiresAt: new Date(Date.now() - 1000) })
		.where(eq(session.id, hashToken(token)));
	assert.equal(await verifySession(token), null);
	const row = await db.read.query.session.findFirst({ where: eq(session.id, hashToken(token)) });
	assert.equal(row, undefined, 'expired row should be deleted on read');
});

test('sliding expiry extends only past the halfway point', async () => {
	const { token } = await issueSession(USER, 'customer');
	const id = hashToken(token);

	const fresh = await db.read.query.session.findFirst({ where: eq(session.id, id) });
	await verifySession(token);
	const unchanged = await db.read.query.session.findFirst({ where: eq(session.id, id) });
	assert.equal(unchanged!.expiresAt.getTime(), fresh!.expiresAt.getTime(), 'no write on a fresh session');

	const nearlyExpired = new Date(Date.now() + SESSION_TTL_MS / 4);
	await db.write.update(session).set({ expiresAt: nearlyExpired }).where(eq(session.id, id));
	await verifySession(token);
	const extended = await db.read.query.session.findFirst({ where: eq(session.id, id) });
	assert.ok(extended!.expiresAt.getTime() > nearlyExpired.getTime(), 'should extend past halfway');

	await revokeSession(token);
});

test('revoke kills the session immediately', async () => {
	const { token } = await issueSession(USER, 'customer');
	await revokeSession(token);
	assert.equal(await verifySession(token), null);
});

test('an OTP is single-use', async () => {
	const sent = await createOtp(PHONE, null);
	assert.ok(sent.ok);
	assert.equal(await verifyOtp(PHONE, sent.code).then((r) => r.ok), true);
	assert.equal(await verifyOtp(PHONE, sent.code).then((r) => r.ok), false, 'second use must fail');
});

test('the OTP code is hashed at rest', async () => {
	await db.write.delete(rateLimit).where(sql`${rateLimit.key} like ${'otp:send:%' + PHONE}`);
	const sent = await createOtp(PHONE, null);
	assert.ok(sent.ok);
	const row = await db.read.query.otp.findFirst({ where: eq(otp.phoneE164, PHONE) });
	assert.notEqual(row!.codeHash, sent.code);
	assert.equal(row!.codeHash, hashToken(sent.code));
	await db.write.delete(otp).where(eq(otp.phoneE164, PHONE));
});

test('a wrong OTP is rejected and burns an attempt', async () => {
	await db.write.delete(rateLimit).where(sql`${rateLimit.key} like ${'otp:send:%' + PHONE}`);
	const sent = await createOtp(PHONE, null);
	assert.ok(sent.ok);
	const wrong = sent.code === '000000' ? '111111' : '000000';

	const bad = await verifyOtp(PHONE, wrong);
	assert.equal(bad.ok, false);
	const row = await db.read.query.otp.findFirst({ where: eq(otp.phoneE164, PHONE) });
	assert.equal(row!.attempts, 1);

	assert.equal(await verifyOtp(PHONE, sent.code).then((r) => r.ok), true, 'right code still works');
});

test('OTP send is rate limited per phone', async () => {
	await db.write.delete(rateLimit).where(sql`${rateLimit.key} like ${'otp:send:%' + PHONE}`);

	for (let i = 0; i < SEND_LIMIT_PER_PHONE.limit; i++) {
		const r = await createOtp(PHONE, null);
		assert.equal(r.ok, true, `send ${i + 1} should be allowed`);
	}
	const blocked = await createOtp(PHONE, null);
	assert.equal(blocked.ok, false);
	assert.equal(blocked.ok === false && blocked.reason, 'rate_limited');
});
