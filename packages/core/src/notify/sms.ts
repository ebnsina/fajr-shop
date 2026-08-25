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

export function providerFromEnv(): SmsProvider {
	const key = process.env.SMS_API_KEY;
	if (process.env.SMS_PROVIDER === 'alpha' && key) {
		return alphaProvider(key, process.env.SMS_SENDER_ID);
	}
	return consoleProvider;
}
