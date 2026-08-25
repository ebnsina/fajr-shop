import type { PaymentProvider, SessionInput, SessionResult, VerifiedPayment } from './types.ts';

// Buy-now-pay-later. The merchant is paid in full up front and Tabby carries
// the credit risk, which is why it raises basket size rather than deferring it.
export function tabby(
	secretKey: string,
	merchantCode: string,
	baseUrl = 'https://api.tabby.ai/api/v2'
): PaymentProvider {
	const headers = {
		'content-type': 'application/json',
		authorization: `Bearer ${secretKey}`
	};

	return {
		name: 'tabby',

		async createSession(input: SessionInput): Promise<SessionResult> {
			try {
				const res = await fetch(`${baseUrl}/checkout`, {
					method: 'POST',
					headers,
					body: JSON.stringify({
						payment: {
							// Tabby takes major units as a decimal string.
							amount: (input.amountMinor / 100).toFixed(2),
							currency: input.currency,
							description: `Order ${input.publicCode}`,
							buyer: {
								phone: input.customerPhone,
								email: input.customerEmail || 'noreply@example.com',
								name: input.customerName
							},
							shipping_address: { city: input.city ?? '', address: input.address },
							order: { reference_id: input.publicCode },
							meta: { order_id: input.orderId, customer: input.customerPhone }
						},
						lang: 'en',
						merchant_code: merchantCode,
						merchant_urls: {
							success: input.successUrl,
							cancel: input.cancelUrl,
							failure: input.failUrl
						}
					}),
					signal: AbortSignal.timeout(20_000)
				});

				const json = (await res.json()) as {
					id?: string;
					status?: string;
					configuration?: { available_products?: { installments?: { web_url?: string }[] } };
					errors?: { message?: string }[];
				};

				const url = json.configuration?.available_products?.installments?.[0]?.web_url;

				// A rejection is normal, not an outage: Tabby declines buyers it does
				// not want to lend to, and the shopper should be told plainly.
				if (json.status === 'rejected') {
					return { ok: false, error: 'Tabby could not approve this order. Please choose another method.' };
				}
				if (!res.ok || !url || !json.id) {
					return { ok: false, error: json.errors?.[0]?.message ?? `tabby returned ${res.status}` };
				}

				return { ok: true, redirectUrl: url, sessionRef: json.id, raw: json as Record<string, unknown> };
			} catch (err) {
				return { ok: false, error: String(err) };
			}
		},

		async verify(fields: Record<string, string>): Promise<VerifiedPayment> {
			const paymentId = fields.payment_id ?? fields.id ?? '';
			const empty: VerifiedPayment = {
				ok: false, orderId: null, amountMinor: 0, currency: '',
				reference: null, status: 'failed', raw: fields
			};
			if (!paymentId) return empty;

			try {
				const res = await fetch(`${baseUrl}/payments/${paymentId}`, {
					headers,
					signal: AbortSignal.timeout(20_000)
				});
				const json = (await res.json()) as {
					id?: string;
					status?: string;
					amount?: string;
					currency?: string;
					meta?: { order_id?: string };
				};
				if (!res.ok) return { ...empty, raw: json as Record<string, unknown> };

				const closed = json.status === 'CLOSED' || json.status === 'AUTHORIZED';
				return {
					ok: closed,
					orderId: json.meta?.order_id ?? null,
					amountMinor: Math.round(Number(json.amount ?? 0) * 100),
					currency: json.currency ?? '',
					reference: json.id ?? null,
					status: closed ? 'succeeded' : json.status === 'CREATED' ? 'pending' : 'failed',
					raw: json as Record<string, unknown>
				};
			} catch (err) {
				return { ...empty, raw: { error: String(err) } };
			}
		}
	};
}
