import { db, message, newId, eq } from '@fajr/db';
import { smsProvider, type SmsProvider } from './sms.ts';
import { configFor, enabledOf } from '../integrations/index.ts';
import { render, parts, type TemplateName } from './templates.ts';

export * from './sms.ts';
export * from './templates.ts';

export type SendInput = {
	to: string;
	template: TemplateName;
	vars: Record<string, string | number>;
	locale?: string;
	orderId?: string | null;
	/** The same key twice is the same message, however often a worker retries. */
	idempotencyKey: string;
};

// The row is written before the send.
export async function sendSms(
	input: SendInput,
	provider?: SmsProvider
): Promise<{ ok: boolean; duplicate?: boolean; parts?: number }> {
	const body = render(input.template, input.vars, input.locale);
	// Whatever the merchant connected, or the console provider so a shop with no
	// SMS still records the message instead of throwing mid-order.
	const sender = provider ?? (await smsProvider(configFor, () => enabledOf('sms')));

	const inserted = await db.write
		.insert(message)
		.values({
			id: newId('msg'),
			channel: 'sms',
			toAddress: input.to,
			template: input.template,
			body,
			provider: sender.name,
			idempotencyKey: input.idempotencyKey,
			orderId: input.orderId ?? null
		})
		.onConflictDoNothing({ target: [message.channel, message.idempotencyKey] })
		.returning({ id: message.id });

	if (!inserted.length) return { ok: true, duplicate: true };
	const id = inserted[0]!.id;

	const result = await sender.send(input.to, body);

	await db.write
		.update(message)
		.set(
			result.ok
				? { status: 'sent', providerRef: result.ref ?? null, sentAt: new Date() }
				: { status: 'failed', error: result.error }
		)
		.where(eq(message.id, id));

	return { ok: result.ok, parts: parts(body) };
}
