import { randomBytes } from 'node:crypto';

const ALPHABET = '0123456789abcdefghijkmnpqrstvwxyz'; // Crockford-ish: no i, l, o, u

/** Sortable, non-sequential id: 8 chars of ms timestamp + 12 random. */
export function newId(prefix?: string): string {
	let ts = Date.now();
	let out = '';
	for (let i = 0; i < 8; i++) {
		out = ALPHABET[ts % 32]! + out;
		ts = Math.floor(ts / 32);
	}
	const bytes = randomBytes(12);
	for (let i = 0; i < 12; i++) out += ALPHABET[bytes[i]! % 32]!;
	return prefix ? `${prefix}_${out}` : out;
}

// Public-facing order code. Deliberately not sequential — a sequential number tells any
// competitor how many orders the shop did last month.
export function newPublicCode(): string {
	const bytes = randomBytes(6);
	let out = '';
	for (let i = 0; i < 6; i++) out += ALPHABET[bytes[i]! % 32]!;
	return out.toUpperCase();
}
