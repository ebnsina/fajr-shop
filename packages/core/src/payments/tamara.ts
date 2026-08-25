import type { PaymentProvider, SessionInput, SessionResult, VerifiedPayment } from './types.ts';

// Split payments, strongest in Saudi. Same shape as Tabby, different vocabulary.
export function tamara(apiToken: string, baseUrl = 'https://api.tamara.co'): PaymentProvider {
	const headers = {
		'content-type': 'application/json',
		authorization: `Bearer ${apiToken}`
	};

	return {
		name: 'tamara',

		async createSession(input: SessionInput): Promise<SessionResult> {
			try {
				const amount = { amount: (input.amountMinor / 100).toFixed(2), currency: input.currency };
				const [firstName, ...rest] = input.customerName.split(' ');

				const res = await fetch(`${baseUrl}/checkout`, {
					method: 'POST',
					headers,
					body: JSON.stringify({
						order_reference_id: input.publicCode,
						total_amount: amount,
						description: `Order ${input.publicCode}`,
						country_code: 'SA',
						payment_type: 'PAY_BY_INSTALMENTS',
						instalments: 4,
						locale: 'en_US',
						items: [
							{
								name: `Order ${input.publicCode}`,
								type: 'Physical',
								reference_id: input.publicCode,
								sku: input.publicCode,
								quantity: 1,
								unit_price: amount,
								total_amount: amount
							}
						],
						consumer: {
							first_name: firstName || input.customerName,
							last_name: rest.join(' ') || '-',
							phone_number: input.customerPhone,
							email: input.customerEmail || 'noreply@example.com'
						},
						shipping_address: {
							first_name: firstName || input.customerName,
							last_name: rest.join(' ') || '-',
							line1: input.address,
							city: input.city ?? '',
							country_code: 'SA'
						},
						merchant_url: {
							success: input.successUrl,
							failure: input.failUrl,
							cancel: input.cancelUrl,
							notification: input.ipnUrl
						}
					}),
					signal: AbortSignal.timeout(20_000)
				});

				const json = (await res.json()) as {
					checkout_id?: string;
					checkout_url?: string;
					message?: string;
				};

				if (!res.ok || !json.checkout_url || !json.checkout_id) {
					return { ok: false, error: json.message ?? `tamara returned ${res.status}` };
				}

				return {
					ok: true,
					redirectUrl: json.checkout_url,
					sessionRef: json.checkout_id,
					raw: json as Record<string, unknown>
				};
			} catch (err) {
				return { ok: false, error: String(err) };
			}
		},

		async verify(fields: Record<string, string>): Promise<VerifiedPayment> {
			const orderId = fields.orderId ?? fields.order_id ?? '';
			const empty: VerifiedPayment = {
				ok: false, orderId: null, amountMinor: 0, currency: '',
				reference: null, status: 'failed', raw: fields
			};
			if (!orderId) return empty;

			try {
				const res = await fetch(`${baseUrl}/orders/${orderId}`, {
					headers,
					signal: AbortSignal.timeout(20_000)
				});
				const json = (await res.json()) as {
					order_id?: string;
					order_reference_id?: string;
					status?: string;
					total_amount?: { amount?: string; currency?: string };
				};
				if (!res.ok) return { ...empty, raw: json as Record<string, unknown> };

				// Approved means Tamara will pay us; captured means they have.
				const paid = json.status === 'fully_captured' || json.status === 'approved';
				return {
					ok: paid,
					orderId: json.order_reference_id ?? null,
					amountMinor: Math.round(Number(json.total_amount?.amount ?? 0) * 100),
					currency: json.total_amount?.currency ?? '',
					reference: json.order_id ?? null,
					status: paid ? 'succeeded' : json.status === 'new' ? 'pending' : 'failed',
					raw: json as Record<string, unknown>
				};
			} catch (err) {
				return { ...empty, raw: { error: String(err) } };
			}
		}
	};
}
