import { error, fail } from '@sveltejs/kit';
import type { components } from '#lib/api.js';
import { errorText } from '#lib/copy.js';
import { toPoisha } from '#lib/money.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const { data, error: err, response } = await locals.api.GET('/v1/admin/discounts');
	if (!data) error(response.status, errorText(err?.error.code));
	return { discounts: data.items };
};

// ponytail: Bangladesh time is fixed at +06:00 (no daylight saving); read the shop's zone if it ever sells abroad.
const dhaka = (v: FormDataEntryValue | null) => (v ? `${v}:00+06:00` : null);

// Amounts are typed in taka; the API takes poisha.
function input(form: FormData): components['schemas']['DiscountInput'] {
	const num = (k: string) => {
		const v = String(form.get(k) ?? '').trim();
		return v && Number(v) > 0 ? Number(v) : null;
	};
	const kind = form.get('kind') === 'fixed' ? 'fixed' : 'percent';
	const cap = num('max_discount');
	const limit = num('usage_limit');
	return {
		code: String(form.get('code') ?? '').trim(),
		description: String(form.get('description') ?? '').trim() || null,
		kind,
		value: kind === 'percent' ? Math.round(num('value') ?? 0) : toPoisha(num('value') ?? 0),
		max_discount: kind === 'percent' && cap ? toPoisha(cap) : null,
		min_subtotal: toPoisha(num('min_subtotal') ?? 0),
		starts_at: dhaka(form.get('starts_at')),
		ends_at: dhaka(form.get('ends_at')),
		usage_limit: limit ? Math.round(limit) : null,
		active: form.has('active')
	};
}

const failure = (
	action: string,
	err?: { error: { code: string; fields?: Record<string, string> } }
) => fail(400, { action, fields: err?.error.fields ?? {}, message: errorText(err?.error.code) });

export const actions: Actions = {
	create: async ({ request, locals }) => {
		const { data, error: err } = await locals.api.POST('/v1/admin/discounts', {
			body: input(await request.formData())
		});
		if (!data) return failure('create', err);
		return { action: 'create', saved: true };
	},
	update: async ({ request, locals }) => {
		const form = await request.formData();
		const { data, error: err } = await locals.api.PUT('/v1/admin/discounts/{id}', {
			params: { path: { id: String(form.get('id')) } },
			body: input(form)
		});
		if (!data) return failure('update', err);
		return { action: 'update', saved: true };
	},
	delete: async ({ request, locals }) => {
		const id = String((await request.formData()).get('id'));
		const { error: err } = await locals.api.DELETE('/v1/admin/discounts/{id}', {
			params: { path: { id } }
		});
		if (err) return failure('delete', err);
		return { action: 'delete', saved: true };
	}
};
