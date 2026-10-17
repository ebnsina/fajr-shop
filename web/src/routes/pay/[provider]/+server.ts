import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// The gateway posts the customer back here. Nothing it sends is trusted: the API asks the
// gateway itself whether this payment went through before marking anything paid.
export const POST: RequestHandler = async ({ request, params, url, locals }) => {
	const form = await request.formData();
	const number = /^FS(\d+)-/.exec(String(form.get('tran_id') ?? ''))?.[1];
	const result = url.searchParams.get('r');
	if (result === 'success') {
		const { data } = await locals.api.POST('/v1/payments/{provider}/confirm', {
			params: { path: { provider: params.provider } },
			body: { val_id: String(form.get('val_id') ?? '') }
		});
		if (data) redirect(303, `/orders/${data.number}?paid=1`);
	}
	if (!number) redirect(303, '/');
	redirect(303, `/orders/${number}?payment=${result === 'cancel' ? 'cancelled' : 'failed'}`);
};
