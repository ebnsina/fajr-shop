import type { CourierStats } from './score.ts';

export type Lookup = {
	network: CourierStats;
	/** Per-courier breakdown — staff trust a table of numbers, not a score. */
	raw: Record<string, unknown>;
};

export interface RiskProvider {
	readonly name: string;
	lookup(phoneE164: string): Promise<Lookup | null>;
}

/** Dev and tests. Returns nothing, which exercises the `unknown` path. */
export const nullProvider: RiskProvider = {
	name: 'none',
	async lookup() {
		return null;
	}
};

// BD courier-history aggregators expose roughly the same shape: post a phone number, get per-
// courier delivered/cancelled totals back. A three second ceiling is deliberate.
export function aggregatorProvider(endpoint: string, apiKey: string, name = 'aggregator'): RiskProvider {
	return {
		name,
		async lookup(phoneE164) {
			const local = phoneE164.replace(/^\+880/, '0');
			try {
				const res = await fetch(endpoint, {
					method: 'POST',
					headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
					body: JSON.stringify({ phone: local }),
					signal: AbortSignal.timeout(3000)
				});
				if (!res.ok) return null;

				const json = (await res.json()) as {
					couriers?: Record<string, { success?: number; cancel?: number }>;
					total?: { success?: number; cancel?: number };
				};

				const totals = json.total ?? { success: 0, cancel: 0 };
				return {
					network: { delivered: Number(totals.success ?? 0), returned: Number(totals.cancel ?? 0) },
					raw: (json.couriers ?? {}) as Record<string, unknown>
				};
			} catch {
				// Timeout, DNS, malformed JSON — all the same answer: we don't know.
				return null;
			}
		}
	};
}

export function providerFromEnv(): RiskProvider {
	const endpoint = process.env.FRAUD_API_URL;
	const key = process.env.FRAUD_API_KEY;
	if (endpoint && key) return aggregatorProvider(endpoint, key, process.env.FRAUD_PROVIDER ?? 'aggregator');
	return nullProvider;
}
