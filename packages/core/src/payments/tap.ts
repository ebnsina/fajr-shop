import type { PaymentProvider, SessionInput, SessionResult, VerifiedPayment } from './types.ts';

// Tap covers the whole Gulf through one contract: cards, Apple Pay, mada in
// Saudi, KNET in Kuwait, Benefit in Bahrain.
export function tap(secretKey: string, baseUrl = 'https://api.tap.company/v2'): PaymentProvider {
	const headers = {
		'content-type': 'application/json',
		authorization: `Bearer ${secretKey}`
	};

	return {
		name: 'tap',

		async createSession(input: SessionInput): Promise<SessionResult> {
			try {
				const res = await fetch(`${baseUrl}/charges`, {
					method: 'POST',
					headers,
					body: JSON.stringify({
						// Tap takes major units with an explicit currency.
						amount: input.amountMinor / 100,
						currency: input.currency,
						threeDSecure: true,
						save_card: false,
						description: `Order ${input.publicCode}`,
						// Echoed back on the callback, so we can find our own order.
						metadata: { orderId: input.orderId, publicCode: input.publicCode },
						reference: { order: input.publicCode },
						customer: {
							first_name: input.customerName,
							email: input.customerEmail || undefined,
							phone: {
								// Tap wants the country code and the rest apart.
								country_code: input.customerPhone.replace(/^\+/, '').slice(0, 3),
								number: input.customerPhone.replace(/^\+/, '').slice(3)
							}
						},
						source: { id: 'src_all' },
						post: { url: input.ipnUrl },
						redirect: { url: input.successUrl }
					}),
					signal: AbortSignal.timeout(20_000)
				});

				const json = (await res.json()) as {
					id?: string;
					transaction?: { url?: string };
					errors?: { description?: string }[];
				};

				if (!res.ok || !json.transaction?.url || !json.id) {
					return {
						ok: false,
						error: json.errors?.[0]?.description ?? `tap returned ${res.status}`
					};
				}

				return {
					ok: true,
					redirectUrl: json.transaction.url,
					sessionRef: json.id,
					raw: json as Record<string, unknown>
				};
			} catch (err) {
				return { ok: false, error: String(err) };
			}
		},

		// Never trusts the callback body: it asks Tap what actually happened.
		async verify(fields: Record<string, string>): Promise<VerifiedPayment> {
			const chargeId = fields.tap_id ?? fields.id ?? '';
			const empty: VerifiedPayment = {
				ok: false, orderId: null, amountMinor: 0, currency: '',
				reference: null, status: 'failed', raw: fields
			};
			if (!chargeId) return empty;

			try {
				const res = await fetch(`${baseUrl}/charges/${chargeId}`, {
					headers,
					signal: AbortSignal.timeout(20_000)
				});
				const json = (await res.json()) as {
					id?: string;
					status?: string;
					amount?: number;
					currency?: string;
					metadata?: { orderId?: string };
				};
				if (!res.ok) return { ...empty, raw: json as Record<string, unknown> };

				const captured = json.status === 'CAPTURED';
				return {
					ok: captured,
					orderId: json.metadata?.orderId ?? null,
					amountMinor: Math.round((json.amount ?? 0) * 100),
					currency: json.currency ?? '',
					reference: json.id ?? null,
					status: captured ? 'succeeded' : json.status === 'INITIATED' ? 'pending' : 'failed',
					raw: json as Record<string, unknown>
				};
			} catch (err) {
				return { ...empty, raw: { error: String(err) } };
			}
		}
	};
}
