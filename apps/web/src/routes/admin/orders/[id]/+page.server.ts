import { error, fail } from '@sveltejs/kit';
import {
	getOrder, setVerification, cancel, markDelivered, confirmPayment, recordManualPayment
} from '@fajr/core/orders';
import { pushToCourier, refreshTracking, shipmentsFor, rankCouriers } from '@fajr/core/shipping';
import { db, order, eq } from '@fajr/db';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const detail = await getOrder(params.id);
	if (!detail) error(404, 'Order not found');

	const [shipments, couriers] = await Promise.all([
		shipmentsFor(detail.id),
		// Ranked by how well each actually delivers to this address.
		rankCouriers(detail.address?.district, detail.address?.thana)
	]);

	return { order: detail, shipments, couriers };
};

export const actions: Actions = {
	verify: async ({ request, params, locals }) => {
		const form = await request.formData();
		const status = String(form.get('status') ?? '') as 'called' | 'confirmed' | 'cancelled' | 'unreachable';
		if (!['called', 'confirmed', 'cancelled', 'unreachable'].includes(status)) return fail(400);

		await setVerification(params.id, status, { type: 'admin', id: locals.staff?.id }, String(form.get('note') ?? '') || undefined);
		return { done: true };
	},

	payment: async ({ request, params, locals }) => {
		const form = await request.formData();
		const paymentId = String(form.get('paymentId') ?? '');
		if (paymentId) {
			await confirmPayment(paymentId, { type: 'admin', id: locals.staff?.id });
			return { done: true };
		}

		// Staff entering a trxID the customer read out over the phone.
		const reference = String(form.get('reference') ?? '').trim();
		const amount = Number(form.get('amountMinor') ?? 0);
		if (reference.length < 4 || amount <= 0) return fail(400, { error: 'Enter the transaction ID and amount.' });
		await recordManualPayment(params.id, { reference, amountMinor: amount }, { type: 'admin', id: locals.staff?.id });
		return { done: true };
	},

	ship: async ({ request, params, locals }) => {
		const form = await request.formData();
		const courier = String(form.get('courier') ?? '') || undefined;

		const result = await pushToCourier(params.id, {
			courier,
			actor: { type: 'admin', id: locals.staff?.id }
		});

		if (!result.ok) {
			return fail(502, {
				error: result.retryable
					? `${result.error} — the courier may be down, try again in a minute.`
					: `${result.error} — check the address and phone number.`
			});
		}
		return { done: true };
	},

	track: async ({ request }) => {
		const form = await request.formData();
		await refreshTracking(String(form.get('shipmentId')));
		return { done: true };
	},

	deliver: async ({ params, locals }) => {
		await markDelivered(params.id, { type: 'admin', id: locals.staff?.id });
		return { done: true };
	},

	cancel: async ({ request, params, locals }) => {
		const form = await request.formData();
		const reason = String(form.get('reason') ?? '').trim() || 'Cancelled by staff';
		await cancel(params.id, reason, { type: 'admin', id: locals.staff?.id });
		return { done: true };
	},

	note: async ({ request, params }) => {
		const form = await request.formData();
		await db.write
			.update(order)
			.set({ staffNote: String(form.get('staffNote') ?? '') || null, updatedAt: new Date() })
			.where(eq(order.id, params.id));
		return { saved: true };
	}
};
