import { db, setting, eq } from '@fajr/db';
import { getOrder } from '@fajr/core/orders';
import { sendSms } from '@fajr/core/notify';
import type { Handler } from '../outbox.ts';

async function store() {
	const row = await db.read.query.setting.findFirst({ where: eq(setting.id, 'default') });
	return { name: row?.storeName ?? 'Fajr Shop', locale: row?.defaultLocale ?? 'bn' };
}

const taka = (minor: number) => new Intl.NumberFormat('en-US').format(Math.round(minor / 100));

// One consumer per topic. Each is idempotent by key, so a redelivered outbox row costs nothing
// — which is the whole reason the outbox can retry at all.
export const orderPlaced: Handler = async (payload) => {
	const orderId = String(payload.orderId);
	const order = await getOrder(orderId);
	if (!order) return;

	const s = await store();
	await sendSms({
		to: order.phoneE164,
		template: 'order.placed',
		vars: { store: s.name, code: order.publicCode, total: taka(order.totalMinor) },
		locale: s.locale,
		orderId,
		idempotencyKey: `${orderId}:placed`
	});
};

export const orderDelivered: Handler = async (payload) => {
	const orderId = String(payload.orderId);
	const order = await getOrder(orderId);
	if (!order) return;

	const s = await store();
	await sendSms({
		to: order.phoneE164,
		template: 'order.delivered',
		vars: { store: s.name, code: order.publicCode },
		locale: s.locale,
		orderId,
		idempotencyKey: `${orderId}:delivered`
	});
};

export const orderShipped: Handler = async (payload) => {
	const orderId = String(payload.orderId);
	const order = await getOrder(orderId);
	if (!order) return;

	const s = await store();
	await sendSms({
		to: order.phoneE164,
		template: 'order.shipped',
		vars: { store: s.name, code: order.publicCode, due: taka(order.totalMinor - order.paidMinor) },
		locale: s.locale,
		orderId,
		idempotencyKey: `${orderId}:shipped`
	});
};
