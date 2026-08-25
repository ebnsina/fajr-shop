import PgBoss from 'pg-boss';
import { releaseExpiredReservations } from '@fajr/core/cart';
import { refreshAllTracking } from '@fajr/core/shipping';
import { findAbandoned, markRecovered } from '@fajr/core/marketing';
import { sendSms } from '@fajr/core/notify';
import { db, setting, eq } from '@fajr/db';
import { drain } from './outbox.ts';
import { orderPlaced, orderShipped, orderDelivered } from './consumers/notifications.ts';
import { orderPurchased } from './consumers/analytics.ts';

// Separate process from day one, even though it's the same box and the same compose file.
// That's the seam: moving it to its own machine is a deploy change, never a refactor.
const boss = new PgBoss({ connectionString: process.env.DATABASE_URL! });

boss.on('error', (err) =>
	console.error(JSON.stringify({ t: new Date().toISOString(), err: String(err) }))
);

await boss.start();

const HANDLERS = {
	'order.placed': orderPlaced,
	'order.shipped': orderShipped,
	'order.delivered': orderDelivered,
	// Two consumers on one topic would need two rows; the purchase event rides
	// its own topic so a CAPI outage cannot hold up the customer's SMS.
	'order.purchased': orderPurchased,
	'order.paid': orderPurchased
};

const log = (event: string, extra: Record<string, unknown> = {}) =>
	console.log(JSON.stringify({ t: new Date().toISOString(), event, ...extra }));

// The outbox is polled rather than pushed.
let draining = false;
const OUTBOX_INTERVAL = 1000;

setInterval(async () => {
	if (draining) return; // never overlap a slow batch with the next tick
	draining = true;
	try {
		const n = await drain(HANDLERS);
		if (n > 0) log('outbox.drained', { count: n });
	} catch (err) {
		log('outbox.error', { err: String(err) });
	} finally {
		draining = false;
	}
}, OUTBOX_INTERVAL);

/** Hand back stock from checkouts nobody finished. */
setInterval(
	async () => {
		try {
			const freed = await releaseExpiredReservations();
			if (freed > 0) log('reservations.released', { carts: freed });
		} catch (err) {
			log('reservations.error', { err: String(err) });
		}
	},
	60_000
);

// Couriers do not call us; their status has to be pulled. Ten minutes is far inside the
// granularity of BD delivery, and it keeps the API call budget small.
setInterval(
	async () => {
		try {
			const changed = await refreshAllTracking();
			if (changed > 0) log('tracking.refreshed', { shipments: changed });
		} catch (err) {
			log('tracking.error', { err: String(err) });
		}
	},
	10 * 60_000
);

// Abandoned carts. Every fifteen minutes is often enough — the window that matters is hours,
// and a tighter loop just costs SMS credit on people who were about to come back anyway.
setInterval(
	async () => {
		try {
			const carts = await findAbandoned(25);
			if (carts.length === 0) return;

			const store = await db.read.query.setting.findFirst({ where: eq(setting.id, 'default') });

			for (const cart of carts) {
				// Stamped before sending: a crash mid-send must not produce a
				// second message to the same customer.
				await markRecovered(cart.cartId);
				await sendSms({
					to: cart.phoneE164,
					template: 'cart.abandoned',
					vars: {
						store: store?.storeName ?? 'Fajr Shop',
						count: cart.itemCount,
						total: new Intl.NumberFormat('en-US').format(Math.round(cart.subtotalMinor / 100))
					},
					locale: store?.defaultLocale ?? 'bn',
					idempotencyKey: `cart:${cart.cartId}:abandoned`
				});
			}
			log('carts.recovered', { count: carts.length });
		} catch (err) {
			log('carts.error', { err: String(err) });
		}
	},
	15 * 60_000
);

log('worker.started', { handlers: Object.keys(HANDLERS) });

for (const sig of ['SIGINT', 'SIGTERM'] as const) {
	process.on(sig, async () => {
		await boss.stop({ graceful: true });
		process.exit(0);
	});
}
