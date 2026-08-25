import { randomInt } from 'node:crypto';
import { db, otp, eq } from '@fajr/db';
import { hashToken, safeEqual } from './token.ts';
import { consume } from './ratelimit.ts';

export const OTP_TTL_MS = 5 * 60 * 1000;
export const OTP_MAX_ATTEMPTS = 5;

/** SMS costs real money and this endpoint gets found within days of launch. */
export const SEND_LIMIT_PER_PHONE = { limit: 3, windowMs: 60 * 60 * 1000 };
export const SEND_LIMIT_PER_IP = { limit: 10, windowMs: 60 * 60 * 1000 };

export type SendResult =
	| { ok: true; code: string; expiresAt: Date }
	| { ok: false; reason: 'rate_limited'; retryAfterMs: number };

// Returns the plain code so the caller can hand it to the SMS provider. It is never stored,
// logged, or returned over HTTP.
export async function createOtp(
	phoneE164: string,
	ip: string | null | undefined
): Promise<SendResult> {
	const byPhone = await consume(
		`otp:send:phone:${phoneE164}`,
		SEND_LIMIT_PER_PHONE.limit,
		SEND_LIMIT_PER_PHONE.windowMs
	);
	if (!byPhone.allowed) return { ok: false, reason: 'rate_limited', retryAfterMs: byPhone.retryAfterMs };

	if (ip) {
		const byIp = await consume(`otp:send:ip:${ip}`, SEND_LIMIT_PER_IP.limit, SEND_LIMIT_PER_IP.windowMs);
		if (!byIp.allowed) return { ok: false, reason: 'rate_limited', retryAfterMs: byIp.retryAfterMs };
	}

	const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
	const expiresAt = new Date(Date.now() + OTP_TTL_MS);

	// One live OTP per phone: requesting a new code invalidates the old one.
	await db.write
		.insert(otp)
		.values({ phoneE164, codeHash: hashToken(code), expiresAt, attempts: 0 })
		.onConflictDoUpdate({
			target: otp.phoneE164,
			set: { codeHash: hashToken(code), expiresAt, attempts: 0, createdAt: new Date() }
		});

	return { ok: true, code, expiresAt };
}

export type VerifyResult = { ok: true } | { ok: false; reason: 'invalid' | 'expired' | 'too_many_attempts' };

/** Single-use: the row is deleted on success, so a code never verifies twice. */
export async function verifyOtp(phoneE164: string, code: string): Promise<VerifyResult> {
	const row = await db.read.query.otp.findFirst({ where: eq(otp.phoneE164, phoneE164) });
	if (!row) return { ok: false, reason: 'invalid' };

	if (row.expiresAt.getTime() <= Date.now()) {
		await db.write.delete(otp).where(eq(otp.phoneE164, phoneE164));
		return { ok: false, reason: 'expired' };
	}

	if (row.attempts >= OTP_MAX_ATTEMPTS) {
		await db.write.delete(otp).where(eq(otp.phoneE164, phoneE164));
		return { ok: false, reason: 'too_many_attempts' };
	}

	if (!safeEqual(row.codeHash, hashToken(code))) {
		await db.write
			.update(otp)
			.set({ attempts: row.attempts + 1 })
			.where(eq(otp.phoneE164, phoneE164));
		return { ok: false, reason: 'invalid' };
	}

	await db.write.delete(otp).where(eq(otp.phoneE164, phoneE164));
	return { ok: true };
}
