import { db, setting, eq } from '@fajr/db';
import { getOrder } from '@fajr/core/orders';
import { sendEvents, configFromEnv, type CapiEvent } from '@fajr/core/analytics';
import type { Handler } from '../outbox.ts';

// Purchase events go server-side because the browser pixel loses every conversion blocked by
// an.
export const orderPurchased: Handler = async (payload) => {
	const config = configFromEnv();
	if (!config) return;

	const orderId = String(payload.orderId);
	const order = await getOrder(orderId);
	if (!order) return;

	const store = await db.read.query.setting.findFirst({ where: eq(setting.id, 'default') });

	const event: CapiEvent = {
		eventName: 'Purchase',
		eventId: orderId,
		eventTime: order.placedAt,
		user: {
			phone: order.phoneE164,
			email: order.email,
			firstName: order.address?.name?.split(' ')[0] ?? null,
			city: order.address?.district,
			country: store?.country ?? 'BD',
			// Captured at checkout when the browser had them.
			fbp: (order.attribution?.fbp as string) ?? null,
			fbc: (order.attribution?.fbc as string) ?? null
		},
		value: order.totalMinor / 100,
		currency: order.currency,
		contentIds: order.items.map((i) => i.sku || i.variantId || i.id),
		numItems: order.items.reduce((sum, i) => sum + i.qty, 0)
	};

	const result = await sendEvents([event], config);
	if (!result.ok) {
		// Thrown so the outbox retries: a lost Purchase is lost attribution, and
		// attribution is what the ad budget is spent against.
		throw new Error(`CAPI rejected the event: ${result.error}`);
	}
};
