import { error, redirect } from '@sveltejs/kit';
import { getOrder } from '@fajr/core/orders';
import { providerFromEnv } from '@fajr/core/payments';
import { bdPhone } from '@fajr/schemas';
import type { PageServerLoad } from './$types';

// Starts a gateway session and bounces the customer to it.
export const load: PageServerLoad = async ({ params, url }) => {
	const phone = bdPhone.safeParse(url.searchParams.get('p') ?? '');
	if (!phone.success) error(404, 'Order not found');

	const order = await getOrder(params.orderId);
	if (!order || order.phoneE164 !== phone.data) error(404, 'Order not found');

	if (order.paymentStatus === 'paid') {
		redirect(303, `/order/${order.publicCode}?p=${encodeURIComponent(phone.data)}`);
	}

	const provider = providerFromEnv();
	if (!provider) error(503, 'Online payment is not configured');

	const owed = order.advanceMinor > 0 ? order.advanceMinor - order.paidMinor : order.totalMinor - order.paidMinor;
	const back = `${url.origin}/order/${order.publicCode}?p=${encodeURIComponent(phone.data)}`;

	const session = await provider.createSession({
		orderId: order.id,
		publicCode: order.publicCode,
		amountMinor: Math.max(0, owed),
		currency: order.currency,
		customerName: order.address?.name ?? 'Customer',
		customerPhone: order.phoneE164,
		customerEmail: order.email,
		address: order.address?.detail ?? '',
		city: order.address?.district,
		successUrl: back,
		failUrl: `${back}&payment=failed`,
		cancelUrl: `${back}&payment=cancelled`,
		ipnUrl: `${url.origin}/api/payments/sslcommerz/ipn`
	});

	if (!session.ok) error(502, `Could not start payment: ${session.error}`);
	redirect(303, session.redirectUrl);
};
