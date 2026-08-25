import { randomUUID } from 'node:crypto';
import { sql } from 'drizzle-orm';
import { env } from '$env/dynamic/private';
import { db } from './db';
import { lead } from './schema';

export type Lead = {
	// 'feature' is a request for something we do not build yet — same person,
	// same pipeline, different reason for writing in.
	kind: 'demo' | 'contact' | 'feature';
	name: string;
	phone: string;
	demo?: string;
	shop?: string;
	ordersBand?: string;
	selling?: string;
	message?: string;
};

// Store one canonical form, or the same person appears three times because they
// typed 01711…, 8801711… and +8801711….
export function normalisePhone(input: string): string {
	const digits = input.replace(/\D/g, '');
	const local = digits.replace(/^(88)?0?/, '');
	return `+880${local}`;
}

// Upsert on (phone, kind): a second submission is the same lead getting warmer,
// not a new one. Returns false if the lead could not be stored.
async function store(entry: Lead): Promise<boolean> {
	try {
		await db()
			.insert(lead)
			.values({
				id: randomUUID(),
				kind: entry.kind,
				demo: entry.demo ?? null,
				name: entry.name,
				phone: normalisePhone(entry.phone),
				shop: entry.shop ?? null,
				ordersBand: entry.ordersBand ?? null,
				selling: entry.selling ?? null,
				message: entry.message ?? null
			})
			.onConflictDoUpdate({
				target: [lead.phone, lead.kind],
				set: {
					name: sql`excluded.name`,
					demo: sql`coalesce(excluded.demo, ${lead.demo})`,
					shop: sql`coalesce(excluded.shop, ${lead.shop})`,
					ordersBand: sql`coalesce(excluded.orders_band, ${lead.ordersBand})`,
					selling: sql`coalesce(excluded.selling, ${lead.selling})`,
					message: sql`coalesce(excluded.message, ${lead.message})`,
					touches: sql`${lead.touches} + 1`,
					lastSeenAt: sql`now()`
				}
			});
		return true;
	} catch (err) {
		// Never block the visitor on our own storage. The log line below is the
		// fallback record, so the lead is not lost even when the database is.
		console.error(JSON.stringify({ t: new Date().toISOString(), leadStoreFailed: String(err) }));
		return false;
	}
}

async function notify(entry: Lead) {
	const webhook = env.ENQUIRY_WEBHOOK_URL;
	if (!webhook) return;

	const text = Object.entries(entry)
		.map(([k, v]) => `${k}: ${v || '—'}`)
		.join('\n');

	await fetch(webhook, {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({ text: `New ${entry.kind} lead\n${text}` }),
		// A slow webhook must not hold the visitor on a spinner.
		signal: AbortSignal.timeout(5000)
	}).catch((err) =>
		console.error(JSON.stringify({ t: new Date().toISOString(), webhookFailed: String(err) }))
	);
}

export async function record(entry: Lead) {
	const stored = await store(entry);
	// Always logged, so a failed write still leaves a recoverable record.
	console.log(JSON.stringify({ t: new Date().toISOString(), lead: entry, stored }));
	await notify(entry);
}

// A public form is a spam target; one submission per address per minute.
// Keyed per form, so opening a demo does not block asking a question after it.
const seen = new Map<string, number>();
const WINDOW_MS = 60_000;

export function tooSoon(ip: string, form: string): boolean {
	const key = `${form}:${ip}`;
	const last = seen.get(key) ?? 0;
	if (Date.now() - last < WINDOW_MS) return true;
	seen.set(key, Date.now());
	return false;
}
