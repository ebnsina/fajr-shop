import type { Courier, Parcel, PushResult, TrackResult, TrackedStatus } from './types.ts';

const STATUS: Record<string, TrackedStatus> = {
	Pending: 'pushed',
	'Pickup Assigned': 'pushed',
	'Picked Up': 'picked',
	'In Transit': 'in_transit',
	'Received By Hub': 'in_transit',
	'Out For Delivery': 'in_transit',
	Delivered: 'delivered',
	'Partial Delivered': 'delivered',
	'Return To Merchant': 'returned',
	Returned: 'returned',
	Cancelled: 'cancelled',
	Lost: 'lost'
};

export type ECourierConfig = { apiKey: string; apiSecret: string; userId: string };

export function ecourier(
	config: ECourierConfig,
	baseUrl = 'https://backoffice.ecourier.com.bd/api'
): Courier {
	const headers = {
		'content-type': 'application/json',
		'API-KEY': config.apiKey,
		'API-SECRET': config.apiSecret,
		'USER-ID': config.userId
	};

	return {
		name: 'ecourier',

		async push(parcel: Parcel): Promise<PushResult> {
			try {
				const res = await fetch(`${baseUrl}/order-place`, {
					method: 'POST',
					headers,
					body: JSON.stringify({
						recipient_name: parcel.recipientName,
						// Local 01… form, not E.164.
						recipient_mobile: parcel.recipientPhone.replace(/^\+880/, '0'),
						recipient_city: '',
						recipient_area: '',
						recipient_address: parcel.address,
						// Their API is in taka, ours in poisha. Convert exactly once.
						package_code: parcel.invoice,
						product_price: Math.round(parcel.codAmountMinor / 100),
						payment_method: parcel.codAmountMinor > 0 ? 'COD' : 'Prepaid',
						comments: parcel.note ?? '',
						number_of_item: 1,
						actual_product_price: Math.round(parcel.codAmountMinor / 100)
					}),
					signal: AbortSignal.timeout(15_000)
				});

				const json = (await res.json()) as {
					success?: boolean;
					tracking?: string;
					message?: string;
					error?: string;
				};

				if (!res.ok || !json.tracking) {
					return {
						ok: false,
						error: json.error ?? json.message ?? `ecourier returned ${res.status}`,
						retryable: res.status >= 500 || res.status === 429
					};
				}

				return {
					ok: true,
					consignmentId: json.tracking,
					trackingCode: json.tracking,
					raw: json as Record<string, unknown>
				};
			} catch (err) {
				return { ok: false, error: String(err), retryable: true };
			}
		},

		async track(consignmentId: string): Promise<TrackResult> {
			try {
				const res = await fetch(`${baseUrl}/track`, {
					method: 'POST',
					headers,
					body: JSON.stringify({ product_id: consignmentId }),
					signal: AbortSignal.timeout(15_000)
				});

				const json = (await res.json()) as {
					data?: { status?: string; updated_at?: string }[];
					message?: string;
				};
				if (!res.ok || !json.data?.length) {
					return { ok: false, error: json.message ?? `ecourier returned ${res.status}` };
				}

				// The history is oldest-first; where it is now is the last entry.
				const latest = json.data[json.data.length - 1]!;
				const status = STATUS[latest.status ?? ''] ?? 'in_transit';
				return {
					ok: true,
					status,
					deliveredAt: status === 'delivered' && latest.updated_at ? new Date(latest.updated_at) : null,
					raw: json as Record<string, unknown>
				};
			} catch (err) {
				return { ok: false, error: String(err) };
			}
		}
	};
}
