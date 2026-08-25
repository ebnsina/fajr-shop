import { error, fail } from '@sveltejs/kit';
import { trackOrder, getOrder, recordManualPayment, quote } from '@fajr/core/orders';
import { bdPhone } from '@fajr/schemas';
import type { Actions, PageServerLoad } from './$types';
import { titled } from '$lib/meta';

// Code plus phone, no login. This kills the "where is my order?" Messenger load, which is a
// staffing cost rather than a feature.
export const load: PageServerLoad = async ({ params, url, parent }) => {
	const { store } = await parent();
	const phoneParam = url.searchParams.get('p');
	if (!phoneParam) error(404, 'Order not found');

	const parsed = bdPhone.safeParse(phoneParam);
	if (!parsed.success) error(404, 'Order not found');

	const tracked = await trackOrder(params.code, parsed.data);
	if (!tracked) error(404, 'Order not found');

	const full = (await getOrder(params.code))!;
	return {
		order: {
			...tracked,
			totalMinor: full.totalMinor,
			advanceMinor: full.advanceMinor,
			paidMinor: full.paidMinor,
			paymentMethod: full.paymentMethod,
			paymentStatus: full.paymentStatus,
			verificationStatus: full.verificationStatus
		},
		phone: parsed.data,
		meta: { title: titled(store.name, `Order ${params.code}`), noindex: true }
	};
};

export const actions: Actions = {
	pay: async ({ request, params }) => {
		const form = await request.formData();
		const reference = String(form.get('reference') ?? '').trim();
		if (reference.length < 6) return fail(400, { error: 'Enter the full transaction reference.' });

		const phone = bdPhone.safeParse(form.get('phone'));
		if (!phone.success) return fail(400, { error: 'Something went wrong. Reload and try again.' });

		// Re-verify ownership: the form is public, so the code alone is not enough.
		const tracked = await trackOrder(params.code, phone.data);
		if (!tracked) return fail(404, { error: 'Order not found.' });

		const full = (await getOrder(params.code))!;
		await recordManualPayment(
			full.id,
			{ reference, amountMinor: full.advanceMinor || full.totalMinor },
			{ type: 'customer' }
		);
		return { submitted: true };
	}
};
