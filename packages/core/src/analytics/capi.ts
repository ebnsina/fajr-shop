import { createHash } from 'node:crypto';

// Server-side Conversions API, not just the browser pixel.
export type CapiEvent = {
	eventName: 'Purchase' | 'InitiateCheckout' | 'AddToCart' | 'ViewContent' | 'Lead';
	/** Must match the browser pixel's event id, or the event is counted twice. */
	eventId: string;
	eventTime: Date;
	eventSourceUrl?: string | null;
	user: {
		phone?: string | null;
		email?: string | null;
		firstName?: string | null;
		city?: string | null;
		country?: string;
		/** From the _fbp / _fbc cookies; the strongest match signal there is. */
		fbp?: string | null;
		fbc?: string | null;
		ip?: string | null;
		userAgent?: string | null;
	};
	value?: number;
	currency?: string;
	contentIds?: string[];
	numItems?: number;
};

// Facebook requires normalised-then-SHA256 identifiers.
const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

export function hashPhone(phone: string): string {
	// Digits only, country code included, no plus — their documented format.
	const digits = phone.replace(/\D/g, '');
	const normalised = digits.startsWith('880') ? digits : digits.replace(/^0/, '880');
	return sha256(normalised);
}

export const hashEmail = (email: string) => sha256(email.trim().toLowerCase());

export const hashName = (name: string) => sha256(name.trim().toLowerCase());

export function buildPayload(events: CapiEvent[], testCode?: string | null) {
	return {
		data: events.map((e) => ({
			event_name: e.eventName,
			event_time: Math.floor(e.eventTime.getTime() / 1000),
			event_id: e.eventId,
			action_source: 'website',
			...(e.eventSourceUrl ? { event_source_url: e.eventSourceUrl } : {}),
			user_data: {
				...(e.user.phone ? { ph: [hashPhone(e.user.phone)] } : {}),
				...(e.user.email ? { em: [hashEmail(e.user.email)] } : {}),
				...(e.user.firstName ? { fn: [hashName(e.user.firstName)] } : {}),
				...(e.user.city ? { ct: [hashName(e.user.city)] } : {}),
				...(e.user.country ? { country: [hashName(e.user.country)] } : {}),
				// fbp/fbc are already opaque ids and must NOT be hashed.
				...(e.user.fbp ? { fbp: e.user.fbp } : {}),
				...(e.user.fbc ? { fbc: e.user.fbc } : {}),
				...(e.user.ip ? { client_ip_address: e.user.ip } : {}),
				...(e.user.userAgent ? { client_user_agent: e.user.userAgent } : {})
			},
			custom_data: {
				...(e.value !== undefined ? { value: e.value, currency: e.currency ?? 'BDT' } : {}),
				...(e.contentIds?.length ? { content_ids: e.contentIds, content_type: 'product' } : {}),
				...(e.numItems !== undefined ? { num_items: e.numItems } : {})
			}
		})),
		...(testCode ? { test_event_code: testCode } : {})
	};
}

export type SendResult = { ok: boolean; received?: number; error?: string };

export async function sendEvents(
	events: CapiEvent[],
	config: { pixelId: string; accessToken: string; testCode?: string | null }
): Promise<SendResult> {
	if (events.length === 0) return { ok: true, received: 0 };

	try {
		const res = await fetch(`https://graph.facebook.com/v21.0/${config.pixelId}/events`, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({
				...buildPayload(events, config.testCode),
				access_token: config.accessToken
			}),
			signal: AbortSignal.timeout(10_000)
		});

		const json = (await res.json()) as { events_received?: number; error?: { message?: string } };
		if (!res.ok) return { ok: false, error: json.error?.message ?? `graph returned ${res.status}` };
		return { ok: true, received: json.events_received ?? 0 };
	} catch (err) {
		return { ok: false, error: String(err) };
	}
}

export function configFromEnv() {
	const pixelId = process.env.FB_PIXEL_ID;
	const accessToken = process.env.FB_CAPI_TOKEN;
	if (!pixelId || !accessToken) return null;
	return { pixelId, accessToken, testCode: process.env.FB_CAPI_TEST_CODE ?? null };
}
