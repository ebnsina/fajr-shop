import { db, order, payment, orderEvent, outbox, newId, eq, and } from '@fajr/db';
import type { PaymentProvider, VerifiedPayment } from './types.ts';
import { sslcommerz } from './sslcommerz.ts';
import { audit } from '../audit/index.ts';

export * from './types.ts';
export { sslcommerz };

export function providerFromEnv(): PaymentProvider | null {
	const id = process.env.SSLCOMMERZ_STORE_ID;
	const pw = process.env.SSLCOMMERZ_STORE_PASSWORD;
	if (!id || !pw) return null;
	return sslcommerz(id, pw, { sandbox: process.env.SSLCOMMERZ_SANDBOX === 'true' });
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
