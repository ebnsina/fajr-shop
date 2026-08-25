import type { Courier, Parcel, PushResult, TrackResult, TrackedStatus } from './types.ts';

// Pathao's own vocabulary, mapped once here so nothing downstream sees it.
const STATUS: Record<string, TrackedStatus> = {
	Pending: 'pushed',
	Pickup_Requested: 'pushed',
	Assigned_for_Pickup: 'pushed',
	Picked: 'picked',
	Pickup_Failed: 'pushed',
	Pickup_Cancelled: 'cancelled',
	At_the_Sorting_HUB: 'in_transit',
	In_Transit: 'in_transit',
	Received_at_Last_Mile_HUB: 'in_transit',
	Assigned_for_Delivery: 'in_transit',
	Delivered: 'delivered',
	Partial_Delivery: 'delivered',
	Return: 'returned',
	Delivery_Failed: 'in_transit',
	On_Hold: 'in_transit',
	Payment_Invoice: 'delivered',
	Cancelled: 'cancelled'
};

export type PathaoConfig = {
	clientId: string;
	clientSecret: string;
	username: string;
	password: string;
	storeId: string;
	sandbox?: boolean;
};

export function pathao(config: PathaoConfig): Courier {
	const baseUrl = config.sandbox
		? 'https://courier-api-sandbox.pathao.com'
		: 'https://api-hermes.pathao.com';

	// Pathao issues a bearer token that outlives a single request, so it is
	// cached until it expires rather than fetched per parcel.
	let token: { value: string; expiresAt: number } | null = null;

	async function accessToken(): Promise<string> {
		if (token && token.expiresAt > Date.now() + 60_000) return token.value;

		const res = await fetch(`${baseUrl}/aladdin/api/v1/issue-token`, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({
				client_id: config.clientId,
				client_secret: config.clientSecret,
				username: config.username,
				password: config.password,
				grant_type: 'password'
			}),
			signal: AbortSignal.timeout(15_000)
		});

		const json = (await res.json()) as { access_token?: string; expires_in?: number };
		if (!res.ok || !json.access_token) throw new Error('pathao: could not issue a token');

		token = {
			value: json.access_token,
			expiresAt: Date.now() + (json.expires_in ?? 3600) * 1000
		};
		return token.value;
	}

	return {
		name: 'pathao',

		async push(parcel: Parcel): Promise<PushResult> {
			try {
				const bearer = await accessToken();

				const res = await fetch(`${baseUrl}/aladdin/api/v1/orders`, {
					method: 'POST',
					headers: { 'content-type': 'application/json', authorization: `Bearer ${bearer}` },
					body: JSON.stringify({
						store_id: Number(config.storeId),
						merchant_order_id: parcel.invoice,
						recipient_name: parcel.recipientName,
						// Pathao wants the local 01… form, not E.164.
						recipient_phone: parcel.recipientPhone.replace(/^\+880/, '0'),
						recipient_address: parcel.address,
						delivery_type: 48,
						item_type: 2,
						item_quantity: 1,
						// Their weight is kilograms with a 0.5 floor.
						item_weight: Math.max(0.5, (parcel.weightGrams ?? 500) / 1000),
						// Their API is in taka, ours in poisha. Convert exactly once.
						amount_to_collect: Math.round(parcel.codAmountMinor / 100),
						special_instruction: parcel.note ?? ''
					}),
					signal: AbortSignal.timeout(15_000)
				});

				const json = (await res.json()) as {
					data?: { consignment_id?: string; order_status?: string };
					message?: string;
				};

				if (!res.ok || !json.data?.consignment_id) {
					return {
						ok: false,
						error: json.message ?? `pathao returned ${res.status}`,
						// 4xx is our payload's fault and will fail again identically.
						retryable: res.status >= 500 || res.status === 429
					};
				}

				return {
					ok: true,
					consignmentId: json.data.consignment_id,
					trackingCode: json.data.consignment_id,
					raw: json as Record<string, unknown>
				};
			} catch (err) {
				return { ok: false, error: String(err), retryable: true };
			}
		},

		async track(consignmentId: string): Promise<TrackResult> {
			try {
				const bearer = await accessToken();
				const res = await fetch(`${baseUrl}/aladdin/api/v1/orders/${consignmentId}/info`, {
					headers: { authorization: `Bearer ${bearer}` },
					signal: AbortSignal.timeout(15_000)
				});

				const json = (await res.json()) as {
					data?: { order_status?: string; updated_at?: string };
					message?: string;
				};
				if (!res.ok || !json.data) return { ok: false, error: json.message ?? `pathao returned ${res.status}` };

				const status = STATUS[json.data.order_status ?? ''] ?? 'in_transit';
				return {
					ok: true,
					status,
					deliveredAt: status === 'delivered' && json.data.updated_at ? new Date(json.data.updated_at) : null,
					raw: json as Record<string, unknown>
				};
			} catch (err) {
				return { ok: false, error: String(err) };
			}
		}
	};
}
