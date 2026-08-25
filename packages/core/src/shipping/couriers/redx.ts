import type { Courier, Parcel, PushResult, TrackResult, TrackedStatus } from './types.ts';

const STATUS: Record<string, TrackedStatus> = {
	'pickup-pending': 'pushed',
	'pickup-assigned': 'pushed',
	'picked-up': 'picked',
	'received-at-hub': 'in_transit',
	'in-transit': 'in_transit',
	'delivery-in-progress': 'in_transit',
	delivered: 'delivered',
	'partially-delivered': 'delivered',
	'return-in-progress': 'returned',
	returned: 'returned',
	'returned-to-merchant': 'returned',
	cancelled: 'cancelled',
	lost: 'lost'
};

export function redx(accessToken: string, baseUrl = 'https://openapi.redx.com.bd/v1.0.0-beta'): Courier {
	const headers = {
		'content-type': 'application/json',
		'API-ACCESS-TOKEN': `Bearer ${accessToken}`
	};

	return {
		name: 'redx',

		async push(parcel: Parcel): Promise<PushResult> {
			try {
				const res = await fetch(`${baseUrl}/parcel`, {
					method: 'POST',
					headers,
					body: JSON.stringify({
						customer_name: parcel.recipientName,
						customer_phone: parcel.recipientPhone.replace(/^\+880/, '0'),
						customer_address: parcel.address,
						merchant_invoice_id: parcel.invoice,
						// RedX takes taka; we hold poisha.
						cash_collection_amount: String(Math.round(parcel.codAmountMinor / 100)),
						parcel_weight: parcel.weightGrams ?? 500,
						value: String(Math.round(parcel.codAmountMinor / 100)),
						instruction: parcel.note ?? ''
					}),
					signal: AbortSignal.timeout(15_000)
				});

				const json = (await res.json()) as { tracking_id?: string; message?: string };
				if (!res.ok || !json.tracking_id) {
					return {
						ok: false,
						error: json.message ?? `redx returned ${res.status}`,
						retryable: res.status >= 500 || res.status === 429
					};
				}

				return {
					ok: true,
					consignmentId: json.tracking_id,
					trackingCode: json.tracking_id,
					raw: json as Record<string, unknown>
				};
			} catch (err) {
				return { ok: false, error: String(err), retryable: true };
			}
		},

		async track(consignmentId: string): Promise<TrackResult> {
			try {
				const res = await fetch(`${baseUrl}/parcel/track/${consignmentId}`, {
					headers,
					signal: AbortSignal.timeout(15_000)
				});

				const json = (await res.json()) as {
					tracking?: { status?: string; time?: string }[];
					message?: string;
				};
				if (!res.ok || !json.tracking?.length) {
					return { ok: false, error: json.message ?? `redx returned ${res.status}` };
				}

				// RedX returns the whole history; the last entry is where it is now.
				const latest = json.tracking[json.tracking.length - 1]!;
				const status = STATUS[latest.status ?? ''] ?? 'in_transit';
				return {
					ok: true,
					status,
					deliveredAt: status === 'delivered' && latest.time ? new Date(latest.time) : null,
					raw: json as Record<string, unknown>
				};
			} catch (err) {
				return { ok: false, error: String(err) };
			}
		}
	};
}
