import { db, order, payment, orderEvent, outbox, newId, eq, and } from '@fajr/db';
import type { PaymentProvider, VerifiedPayment } from './types.ts';
import { sslcommerz } from './sslcommerz.ts';
import { tap } from './tap.ts';
import { tabby } from './tabby.ts';
import { tamara } from './tamara.ts';
import { audit } from '../audit/index.ts';
import { configFor, enabledOf } from '../integrations/index.ts';

export * from './types.ts';
export { sslcommerz, tap, tabby, tamara };

const truthy = (v: string | undefined) => v === 'true' || v === '1';

// Built from what the merchant connected on the integrations page.
const BUILDERS: Record<string, (c: Record<string, string>) => PaymentProvider> = {
	sslcommerz: (c) =>
		sslcommerz(c.storeId ?? '', c.storePassword ?? '', { sandbox: truthy(c.sandbox) }),
	tap: (c) => tap(c.secretKey ?? ''),
	tabby: (c) => tabby(c.secretKey ?? '', c.merchantCode ?? ''),
	tamara: (c) => tamara(c.apiToken ?? '')
};

export const PAYMENT_SLUGS = Object.keys(BUILDERS);

export async function providerFor(slug: string): Promise<PaymentProvider | null> {
	const build = BUILDERS[slug];
	if (!build) return null;
	const config = await configFor(slug);
	return config ? build(config) : null;
}

// Every gateway the merchant has switched on, in install order. The checkout
// offers these alongside cash on delivery.
export async function enabledProviders(): Promise<string[]> {
	const installed = await enabledOf('payment');
	return installed.map((i) => i.slug).filter((slug) => slug in BUILDERS);
}

// Kept for the one caller that still assumes a single gateway.
export async function providerFromEnv(): Promise<PaymentProvider | null> {
	const [first] = await enabledProviders();
	return first ? providerFor(first) : null;
}

export type SettleResult =
	| { ok: true; orderId: string; duplicate?: boolean }
	| { ok: false; reason: 'unverified' | 'unknown_order' | 'amount_mismatch' };

// Apply a verified gateway payment to an order.
export async function settle(verified: VerifiedPayment): Promise<SettleResult> {
	if (!verified.ok || !verified.orderId) return { ok: false, reason: 'unverified' };

	const row = await db.read.query.order.findFirst({ where: eq(order.id, verified.orderId) });
	if (!row) return { ok: false, reason: 'unknown_order' };

	const expected = row.advanceMinor > 0 ? row.advanceMinor : row.totalMinor;
	if (verified.amountMinor < expected) {
		await audit({
			actorType: 'system',
			action: 'payment.mismatch',
			entity: 'order',
			entityId: row.id,
			meta: { expected, received: verified.amountMinor, reference: verified.reference }
		});
		return { ok: false, reason: 'amount_mismatch' };
	}

	// Keyed on the provider's own reference: gateways retry their IPN, and a
	// retry must credit the order once.
	const key = verified.reference ?? `${verified.orderId}:${verified.amountMinor}`;

	const inserted = await db.write
		.insert(payment)
		.values({
			id: newId('pay'),
			orderId: row.id,
			provider: 'sslcommerz',
			amountMinor: verified.amountMinor,
			status: 'succeeded',
			reference: verified.reference,
			idempotencyKey: key,
			raw: verified.raw,
			paidAt: new Date()
		})
		.onConflictDoNothing({ target: [payment.provider, payment.idempotencyKey] })
		.returning({ id: payment.id });

	if (!inserted.length) return { ok: true, orderId: row.id, duplicate: true };

	await db.write.transaction(async (tx) => {
		const paid = row.paidMinor + verified.amountMinor;
		await tx
			.update(order)
			.set({
				paidMinor: paid,
				paymentStatus: paid >= row.totalMinor ? 'paid' : 'advance_paid',
				// Money in the bank is a stronger confirmation than a phone call.
				...(row.status === 'pending' ? { status: 'confirmed' as const, verificationStatus: 'confirmed' as const } : {}),
				updatedAt: new Date()
			})
			.where(eq(order.id, row.id));

		await tx.insert(orderEvent).values({
			id: newId('oev'),
			orderId: row.id,
			type: 'payment.confirmed',
			message: `sslcommerz · ${verified.reference ?? ''}`,
			actorType: 'system',
			meta: { amountMinor: verified.amountMinor }
		});

		await tx
			.insert(outbox)
			.values({
				id: newId('obx'),
				topic: 'order.paid',
				payload: { orderId: row.id, amountMinor: verified.amountMinor },
				idempotencyKey: `${row.id}:paid`
			})
			.onConflictDoNothing({ target: [outbox.topic, outbox.idempotencyKey] });
	});

	return { ok: true, orderId: row.id };
}
