import { randomBytes, createHash, timingSafeEqual } from 'node:crypto';

/** 256 bits of entropy, url-safe. This is the only place a raw token is born. */
export const newToken = () => randomBytes(32).toString('base64url');

// Sessions and OTPs are stored as SHA-256 of the secret, never the secret. A leaked database
// dump then cannot be replayed as live sessions.
export const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

/** Constant-time compare for anything secret. Never use ===. */
export function safeEqual(a: string, b: string): boolean {
	const ab = Buffer.from(a);
	const bb = Buffer.from(b);
	if (ab.length !== bb.length) return false;
	return timingSafeEqual(ab, bb);
}
