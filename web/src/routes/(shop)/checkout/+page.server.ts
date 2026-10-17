import { fail, redirect } from '@sveltejs/kit';
import { errorText } from '#lib/copy.js';
import type { Actions, PageServerLoad } from './$types';

// ?district= picks the delivery charge to show, as on the bag page; the form keeps what was typed.
export const load: PageServerLoad = async ({ locals, url, parent }) => {
	const { cart } = await parent();
	if (!cart.items.length) redirect(303, '/cart');
	const district = url.searchParams.get('district') ?? '';
	const [districts, quote] = await Promise.all([
		locals.api.GET('/v1/districts'),
		district ? locals.api.POST('/v1/cart/shipping-quote', { body: { district } }) : null
	]);
	return {
		districts: districts.data?.items ?? [],
		district,
		quote: quote?.data ?? null,
		quoteError: quote && !quote.data ? errorText(quote.error?.error.code) : null
	};
};

const text = (form: FormData, key: string) => String(form.get(key) ?? '').trim();

export const actions: Actions = {
	place: async ({ request, locals }) => {
		const form = await request.formData();
		const values = {
			name: text(form, 'name'),
			phone: text(form, 'phone'),
			email: text(form, 'email') || null,
			district: text(form, 'district'),
			area: text(form, 'area'),
			address: text(form, 'address'),
			note: text(form, 'note') || null,
			payment_method: 'cod' as const
		};
		const { data, error: err } = await locals.api.POST('/v1/checkout', { body: values });
		if (!data) {
			// Field problems sit by their fields; a changed bag or stock says so in words, from the API.
			const code = err?.error.code;
			const message =
				code === 'validation' ? errorText(code) : (err?.error.message ?? errorText(code));
			return fail(400, { values, fields: err?.error.fields ?? {}, message, code });
		}
		// The token is the order's private link; a guest has no other way back to it.
		redirect(303, `/orders/${data.order.number}?placed=1&token=${encodeURIComponent(data.token)}`);
	}
};
