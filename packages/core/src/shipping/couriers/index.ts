import type { Courier } from './types.ts';
import { steadfast } from './steadfast.ts';

export * from './types.ts';
export { steadfast };

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

const REGISTRY: Record<string, () => Courier> = {
	steadfast: () =>
		steadfast(process.env.STEADFAST_API_KEY ?? '', process.env.STEADFAST_SECRET_KEY ?? ''),
	mock: () => mockCourier()
};

export function courierFor(name: string): Courier {
	const make = REGISTRY[name];
	if (!make) throw new Error(`unknown courier: ${name}`);
	return make();
}

/** Which couriers are configured, in preference order. */
export function enabledCouriers(): string[] {
	const list = (process.env.COURIERS ?? '').split(',').map((s) => s.trim()).filter(Boolean);
	if (list.length) return list;
	return process.env.STEADFAST_API_KEY ? ['steadfast'] : ['mock'];
}
