import { error, fail, redirect } from '@sveltejs/kit';
import { errorText } from '#lib/copy.js';
import { payToken, startPayment } from '#lib/server/pay.js';
import type { Actions, PageServerLoad } from './$types';

const orderNumber = (raw: string) => {
	const n = Number(raw);
	if (!Number.isSafeInteger(n) || n < 1) error(404, errorText('not_found'));
	return n;
};

// Its customer sees it signed in; anyone else needs the link's ?token=, or the one kept while paying.
export const load: PageServerLoad = async ({ locals, params, url, cookies, setHeaders }) => {
	const number = orderNumber(params.number);
	const token = url.searchParams.get('token') ?? payToken(cookies, number);
	const {
		data,
		error: err,
		response
	} = await locals.api.GET('/v1/orders/{number}', {
		params: { path: { number }, query: { token } }
	});
	if (!data) error(response.status, errorText(err?.error.code));
	// The link carries the order's key; don't hand it to other sites in the Referer header.
	setHeaders({ 'referrer-policy': 'no-referrer' });
	return {
		order: data,
		placed: url.searchParams.has('placed'),
		paid: url.searchParams.has('paid'),
		payment: url.searchParams.get('payment'),
		guestLink: !!token
	};
};

export const actions: Actions = {
	pay: async ({ locals, params, url, cookies }) => {
		const number = orderNumber(params.number);
		const token = url.searchParams.get('token') ?? payToken(cookies, number);
		const to = await startPayment(locals, cookies, number, token);
		if (!to) return fail(502, { message: errorText('payment_error') });
		redirect(303, to);
	},
	cod: async ({ locals, params, url, cookies }) => {
		const number = orderNumber(params.number);
		const token = url.searchParams.get('token') ?? payToken(cookies, number);
		const { error: err } = await locals.api.POST('/v1/orders/{number}/cash-on-delivery', {
			params: { path: { number } },
			body: { token }
		});
		if (err) return fail(400, { message: errorText(err.error.code) });
		return { switched: true };
	}
};
