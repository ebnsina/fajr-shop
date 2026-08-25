import type { Courier } from './types.ts';
import { steadfast } from './steadfast.ts';
import { pathao } from './pathao.ts';
import { redx } from './redx.ts';
import { ecourier } from './ecourier.ts';
import { aramex } from './aramex.ts';
import { configFor, enabledOf } from '../../integrations/index.ts';

export * from './types.ts';
export { steadfast, pathao, redx, ecourier, aramex };

/** Dev and tests: accepts every parcel and invents a consignment id. */
export function mockCourier(name = 'mock'): Courier {
	let seq = 0;
	return {
		name,
		async push(parcel) {
			seq += 1;
			return {
				ok: true,
				consignmentId: `${name.toUpperCase()}-${parcel.invoice}-${seq}`,
				trackingCode: `TRK${seq}`,
				raw: { mock: true, invoice: parcel.invoice }
			};
		},
		async track() {
			return { ok: true, status: 'in_transit', raw: { mock: true } };
		}
	};
}

const truthy = (v: string | undefined) => v === 'true' || v === '1';

// Built from the integration's saved config. The merchant connects it on the
// integrations page; nothing here reads the environment any more.
const BUILDERS: Record<string, (c: Record<string, string>) => Courier> = {
	steadfast: (c) => steadfast(c.apiKey ?? '', c.apiSecret ?? ''),
	pathao: (c) =>
		pathao({
			clientId: c.clientId ?? '',
			clientSecret: c.clientSecret ?? '',
			username: c.username ?? '',
			password: c.password ?? '',
			storeId: c.storeId ?? '',
			sandbox: truthy(c.sandbox)
		}),
	redx: (c) => redx(c.apiKey ?? ''),
	ecourier: (c) =>
		ecourier({ apiKey: c.apiKey ?? '', apiSecret: c.apiSecret ?? '', userId: c.userId ?? '' }),
	aramex: (c) =>
		aramex({
			username: c.username ?? '',
			password: c.password ?? '',
			accountNumber: c.accountNumber ?? '',
			accountPin: c.accountPin ?? '',
			accountEntity: c.accountEntity ?? '',
			accountCountryCode: c.accountCountryCode ?? 'AE',
			sandbox: truthy(c.sandbox)
		})
};

export const COURIER_SLUGS = Object.keys(BUILDERS);

// Returns the mock when nothing is connected, so a fresh shop can take an order
// and see the flow rather than erroring at the first parcel.
export async function courierFor(name: string): Promise<Courier> {
	if (name === 'mock') return mockCourier();

	const build = BUILDERS[name];
	if (!build) throw new Error(`unknown courier: ${name}`);

	const config = await configFor(name);
	if (!config) throw new Error(`courier ${name} is not connected`);
	return build(config);
}

/** Which couriers the merchant has actually connected, in install order. */
export async function enabledCouriers(): Promise<string[]> {
	const installed = await enabledOf('courier');
	const usable = installed.map((i) => i.slug).filter((slug) => slug in BUILDERS);
	return usable.length ? usable : ['mock'];
}
