import type { PaymentProvider, SessionInput, SessionResult, VerifiedPayment } from './types.ts';

const LIVE = 'https://securepay.sslcommerz.com';
const SANDBOX = 'https://sandbox.sslcommerz.com';

type InitResponse = {
	status?: string;
	failedreason?: string;
	sessionkey?: string;
	GatewayPageURL?: string;
};

type ValidationResponse = {
	status?: string;
	tran_id?: string;
	amount?: string;
	currency?: string;
	bank_tran_id?: string;
	card_type?: string;
	risk_level?: string;
};

// One integration reaching bKash, Nagad, Rocket, cards and the rest of the MFS rails — one
// contract and one webhook instead of three merchant onboardings.
export function sslcommerz(
	storeId: string,
	storePassword: string,
	opts: { sandbox?: boolean } = {}
): PaymentProvider {
	const base = opts.sandbox ? SANDBOX : LIVE;

	return {
		name: 'sslcommerz',

		async createSession(input: SessionInput): Promise<SessionResult> {
			try {
				const body = new URLSearchParams({
					store_id: storeId,
					store_passwd: storePassword,
					// Their API is in major units; ours is minor. Convert once, here.
					total_amount: (input.amountMinor / 100).toFixed(2),
					currency: input.currency,
					// Our order id round-trips as tran_id and is what we match on.
					tran_id: input.orderId,
					success_url: input.successUrl,
					fail_url: input.failUrl,
					cancel_url: input.cancelUrl,
					ipn_url: input.ipnUrl,
					cus_name: input.customerName,
					cus_phone: input.customerPhone,
					cus_email: input.customerEmail || 'noreply@example.com',
					cus_add1: input.address,
					cus_city: input.city || 'Dhaka',
					cus_country: 'Bangladesh',
					shipping_method: 'Courier',
					product_name: `Order ${input.publicCode}`,
					product_category: 'General',
					product_profile: 'physical-goods'
				});

				const res = await fetch(`${base}/gwprocess/v4/api.php`, {
					method: 'POST',
					body,
					signal: AbortSignal.timeout(15_000)
				});

				const json = (await res.json()) as InitResponse;
				if (json.status !== 'SUCCESS' || !json.GatewayPageURL) {
					return { ok: false, error: json.failedreason ?? `gateway returned ${json.status ?? res.status}` };
				}

				return {
					ok: true,
					redirectUrl: json.GatewayPageURL,
					sessionRef: json.sessionkey ?? '',
					raw: json as Record<string, unknown>
				};
			} catch (err) {
				return { ok: false, error: String(err) };
			}
		},

		// The callback body proves nothing: it arrives over plain HTTP POST and anyone can send one.
		async verify(fields: Record<string, string>): Promise<VerifiedPayment> {
			const empty: VerifiedPayment = {
				ok: false,
				orderId: fields.tran_id ?? null,
				amountMinor: 0,
				currency: fields.currency ?? 'BDT',
				reference: null,
				status: 'failed',
				raw: fields
			};

			const valId = fields.val_id;
			if (!valId) return empty;

			try {
				const url = new URL(`${base}/validator/api/validationserverAPI.php`);
				url.searchParams.set('val_id', valId);
				url.searchParams.set('store_id', storeId);
				url.searchParams.set('store_passwd', storePassword);
				url.searchParams.set('format', 'json');

				const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
				const json = (await res.json()) as ValidationResponse;

				// VALID means paid; VALIDATED means paid and already settled.
				const paid = json.status === 'VALID' || json.status === 'VALIDATED';

				return {
					ok: paid,
					orderId: json.tran_id ?? fields.tran_id ?? null,
					// Rounded, not truncated: 10.995 must not become 1099 poisha.
					amountMinor: Math.round(Number(json.amount ?? 0) * 100),
					currency: json.currency ?? 'BDT',
					reference: json.bank_tran_id ?? null,
					status: paid ? 'succeeded' : 'failed',
					raw: json as Record<string, unknown>
				};
			} catch (err) {
				// A validation we could not complete is not a payment. Never assume.
				return { ...empty, raw: { ...fields, error: String(err) } };
			}
		}
	};
}
