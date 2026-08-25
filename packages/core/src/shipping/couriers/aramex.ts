import type { Courier, Parcel, PushResult, TrackResult, TrackedStatus } from './types.ts';

// Aramex reports a code plus prose. The code is what we map; the prose changes.
const STATUS: Record<string, TrackedStatus> = {
	SH001: 'pushed',
	SH002: 'picked',
	SH003: 'in_transit',
	SH004: 'in_transit',
	SH005: 'in_transit',
	SH006: 'in_transit',
	SH014: 'in_transit',
	SH029: 'in_transit',
	SH043: 'in_transit',
	SH060: 'delivered',
	SH065: 'delivered',
	SH143: 'returned',
	SH162: 'returned',
	SH165: 'cancelled',
	SH999: 'lost'
};

export type AramexConfig = {
	username: string;
	password: string;
	accountNumber: string;
	accountPin: string;
	accountEntity: string;
	accountCountryCode: string;
	sandbox?: boolean;
};

export function aramex(config: AramexConfig): Courier {
	const baseUrl = config.sandbox
		? 'https://ws.dev.aramex.net/ShippingAPI.V2/Shipping/Service_1_0.svc/json'
		: 'https://ws.aramex.net/ShippingAPI.V2/Shipping/Service_1_0.svc/json';

	// Aramex repeats these on every call, so build them once.
	const clientInfo = {
		UserName: config.username,
		Password: config.password,
		Version: 'v1.0',
		AccountNumber: config.accountNumber,
		AccountPin: config.accountPin,
		AccountEntity: config.accountEntity,
		AccountCountryCode: config.accountCountryCode,
		Source: 24
	};

	return {
		name: 'aramex',

		async push(parcel: Parcel): Promise<PushResult> {
			try {
				const res = await fetch(`${baseUrl}/CreateShipments`, {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({
						ClientInfo: clientInfo,
						LabelInfo: { ReportID: 9201, ReportType: 'URL' },
						Shipments: [
							{
								Reference1: parcel.invoice,
								Shipper: null,
								Consignee: {
									Reference1: parcel.invoice,
									PersonName: parcel.recipientName,
									CellPhone: parcel.recipientPhone,
									Address: {
										Line1: parcel.address,
										City: '',
										CountryCode: config.accountCountryCode
									}
								},
								// Aramex takes major units with an explicit currency,
								// unlike the BD couriers, which assume taka.
								...(parcel.codAmountMinor > 0
									? {
											CashOnDeliveryAmount: {
												Value: parcel.codAmountMinor / 100,
												CurrencyCode: 'AED'
											}
										}
									: {}),
								Details: {
									ActualWeight: { Value: (parcel.weightGrams ?? 500) / 1000, Unit: 'KG' },
									NumberOfPieces: 1,
									ProductGroup: 'DOM',
									ProductType: 'CDS',
									PaymentType: 'P',
									DescriptionOfGoods: 'Merchandise',
									GoodsOriginCountry: config.accountCountryCode,
									Services: parcel.codAmountMinor > 0 ? 'CODS' : ''
								},
								Comments: parcel.note ?? ''
							}
						]
					}),
					signal: AbortSignal.timeout(20_000)
				});

				const json = (await res.json()) as {
					HasErrors?: boolean;
					Notifications?: { Message?: string }[];
					Shipments?: { ID?: string; ShipmentLabel?: { LabelURL?: string } }[];
				};

				const shipment = json.Shipments?.[0];
				if (!res.ok || json.HasErrors || !shipment?.ID) {
					const message =
						json.Notifications?.map((n) => n.Message).filter(Boolean).join('; ') ||
						`aramex returned ${res.status}`;
					return { ok: false, error: message, retryable: res.status >= 500 };
				}

				return {
					ok: true,
					consignmentId: shipment.ID,
					trackingCode: shipment.ID,
					labelUrl: shipment.ShipmentLabel?.LabelURL ?? null,
					raw: json as Record<string, unknown>
				};
			} catch (err) {
				return { ok: false, error: String(err), retryable: true };
			}
		},

		async track(consignmentId: string): Promise<TrackResult> {
			try {
				const res = await fetch(`${baseUrl}/TrackShipments`, {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({
						ClientInfo: clientInfo,
						Shipments: [consignmentId],
						GetLastTrackingUpdateOnly: true
					}),
					signal: AbortSignal.timeout(20_000)
				});

				const json = (await res.json()) as {
					HasErrors?: boolean;
					TrackingResults?: { Value?: { UpdateCode?: string; UpdateDateTime?: string }[] }[];
					Notifications?: { Message?: string }[];
				};

				const update = json.TrackingResults?.[0]?.Value?.[0];
				if (!res.ok || json.HasErrors || !update) {
					const message =
						json.Notifications?.map((n) => n.Message).filter(Boolean).join('; ') ||
						`aramex returned ${res.status}`;
					return { ok: false, error: message };
				}

				const status = STATUS[update.UpdateCode ?? ''] ?? 'in_transit';
				return {
					ok: true,
					status,
					deliveredAt:
						status === 'delivered' && update.UpdateDateTime
							? new Date(update.UpdateDateTime)
							: null,
					raw: json as Record<string, unknown>
				};
			} catch (err) {
				return { ok: false, error: String(err) };
			}
		}
	};
}
