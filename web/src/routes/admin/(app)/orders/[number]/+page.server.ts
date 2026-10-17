import { error, fail } from '@sveltejs/kit';
import type { components } from '#lib/api.js';
import { errorText } from '#lib/copy.js';
import type { Actions, PageServerLoad } from './$types';

type Status = components['schemas']['OrderStatus'];

const number = (raw: string) => {
	const n = Number(raw);
	if (!Number.isSafeInteger(n) || n < 1) error(404, errorText('not_found'));
	return n;
};

export const load: PageServerLoad = async ({ locals, params }) => {
	const {
		data,
		error: err,
		response
	} = await locals.api.GET('/v1/admin/orders/{number}', {
		params: { path: { number: number(params.number) } }
	});
	if (!data) error(response.status, errorText(err?.error.code));
	return { order: data };
};

export const actions: Actions = {
	// A move button sends `to`; cancelling, which asks first, sends `cancel` instead.
	move: async ({ request, locals, params }) => {
		const form = await request.formData();
		const to = String(form.get('to') ?? form.get('cancel') ?? '') as Status;
		const { error: err } = await locals.api.POST('/v1/admin/orders/{number}/status', {
			params: { path: { number: number(params.number) } },
			body: {
				from: String(form.get('from')) as Status,
				to,
				note: String(form.get('note') ?? '').trim() || undefined
			}
		});
		if (err) return fail(400, { message: err.error.fields?.to ?? errorText(err.error.code) });
		return { to };
	}
};
