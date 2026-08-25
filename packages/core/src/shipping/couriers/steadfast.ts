import type { Courier, Parcel, PushResult, TrackResult, TrackedStatus } from './types.ts';

/** Steadfast reports its own vocabulary; this is the only place it leaks. */
const STATUS: Record<string, TrackedStatus> = {
	pending: 'pushed',
	in_review: 'pushed',
	delivered_approval_pending: 'in_transit',
	partial_delivered_approval_pending: 'in_transit',
	cancelled_approval_pending: 'in_transit',
	unknown_approval_pending: 'in_transit',
	delivered: 'delivered',
	partial_delivered: 'delivered',
	cancelled: 'returned',
	hold: 'in_transit',
	in_transit: 'in_transit',
	return: 'returned',
	returned: 'returned',
	lost: 'lost'
};

export function steadfast(apiKey: string, secretKey: string, baseUrl = 'https://portal.steadfast.com.bd/api/v1'): Courier {
	const headers = {
		'content-type': 'application/json',
		'Api-Key': apiKey,
		'Secret-Key': secretKey
	};

	return {
		name: 'steadfast',

		async push(parcel: Parcel): Promise<PushResult> {
			try {
				const res = await fetch(`${baseUrl}/create_order`, {
					method: 'POST',
					headers,
					body: JSON.stringify({
						invoice: parcel.invoice,
						recipient_name: parcel.recipientName,
						// Steadfast wants the local 01… form, not E.164.
						recipient_phone: parcel.recipientPhone.replace(/^\+880/, '0'),
						recipient_address: parcel.address,
						// Their API is in taka, ours is in poisha. Convert exactly once.
						cod_amount: parcel.codAmountMinor / 100,
						note: parcel.note ?? ''
					}),
					signal: AbortSignal.timeout(15_000)
				});

				const json = (await res.json()) as {
					status?: number;
					message?: string;
					consignment?: { consignment_id?: number | string; tracking_code?: string };
				};

				if (!res.ok || !json.consignment?.consignment_id) {
					return {
						ok: false,
						error: json.message ?? `courier returned ${res.status}`,
						// 4xx means our payload is wrong; retrying sends the same bad data.
						retryable: res.status >= 500 || res.status === 429
					};
				}

				return {
					ok: true,
					consignmentId: String(json.consignment.consignment_id),
					trackingCode: json.consignment.tracking_code ?? null,
					raw: json as Record<string, unknown>
				};
			} catch (err) {
				// Timeout or network: the parcel may or may not exist at their end,
				// which is exactly why push is keyed by order id.
				return { ok: false, error: String(err), retryable: true };
			}
		},

		async track(consignmentId: string): Promise<TrackResult> {
			try {
				const res = await fetch(`${baseUrl}/status_by_cid/${consignmentId}`, {
					headers,
					signal: AbortSignal.timeout(10_000)
				});
				const json = (await res.json()) as { delivery_status?: string };
				const status = STATUS[json.delivery_status ?? ''] ?? 'in_transit';
				return {
					ok: true,
					status,
					deliveredAt: status === 'delivered' ? new Date() : null,
					raw: json as Record<string, unknown>
				};
			} catch (err) {
				return { ok: false, error: String(err) };
			}
		}
	};
}
