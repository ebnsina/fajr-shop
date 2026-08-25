// SMS behind an adapter, same shape as payments and couriers. BD gateways cost ~BDT 0.25 a
// message; Twilio is twenty times that, so the provider is always local and always swappable.
export type SmsResult = { ok: true; ref?: string } | { ok: false; error: string };

export interface SmsProvider {
	readonly name: string;
	send(to: string, body: string): Promise<SmsResult>;
}

/** Dev and tests: prints instead of spending money. */
export const consoleProvider: SmsProvider = {
	name: 'console',
	async send(to, body) {
		console.log(JSON.stringify({ t: new Date().toISOString(), sms: { to, body } }));
		return { ok: true, ref: 'console' };
	}
};

/** Alpha SMS — one of the common BD gateways. */
export function alphaProvider(apiKey: string, senderId?: string): SmsProvider {
	return {
		name: 'alpha',
		async send(to, body) {
			try {
				const res = await fetch('https://api.sms.net.bd/sendsms', {
					method: 'POST',
					body: new URLSearchParams({
						api_key: apiKey,
						msg: body,
						to,
						...(senderId ? { sender_id: senderId } : {})
					}),
					// A slow gateway must not hold an order worker open.
					signal: AbortSignal.timeout(10_000)
				});
				const json = (await res.json()) as { error?: number; msg?: string; data?: { request_id?: string } };
				if (json.error === 0) return { ok: true, ref: String(json.data?.request_id ?? '') };
				return { ok: false, error: json.msg ?? `provider error ${json.error}` };
			} catch (err) {
				return { ok: false, error: String(err) };
			}
		}
	};
}

// Twilio, for the Gulf and anywhere Alpha does not reach.
export function twilioProvider(accountSid: string, authToken: string, from: string): SmsProvider {
	return {
		name: 'twilio',
		async send(to, body) {
			try {
				const res = await fetch(
					`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
					{
						method: 'POST',
						headers: {
							authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
							'content-type': 'application/x-www-form-urlencoded'
						},
						body: new URLSearchParams({ To: to, From: from, Body: body }),
						signal: AbortSignal.timeout(10_000)
					}
				);
				const json = (await res.json()) as { sid?: string; message?: string };
				if (res.ok && json.sid) return { ok: true, ref: json.sid };
				return { ok: false, error: json.message ?? `twilio returned ${res.status}` };
			} catch (err) {
				return { ok: false, error: String(err) };
			}
		}
	};
}

export const SMS_BUILDERS: Record<string, (c: Record<string, string>) => SmsProvider> = {
	'alpha-sms': (c) => alphaProvider(c.apiKey ?? '', c.senderId),
	twilio: (c) => twilioProvider(c.accountSid ?? '', c.authToken ?? '', c.from ?? '')
};

// Falls back to the console provider, so a shop with no SMS connected still
// records the message rather than throwing mid-order.
export async function smsProvider(
	lookup: (slug: string) => Promise<Record<string, string> | null>,
	enabled: () => Promise<{ slug: string }[]>
): Promise<SmsProvider> {
	for (const { slug } of await enabled()) {
		const build = SMS_BUILDERS[slug];
		if (!build) continue;
		const config = await lookup(slug);
		if (config) return build(config);
	}
	return consoleProvider;
}
