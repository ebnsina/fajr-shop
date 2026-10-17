import { error, fail } from '@sveltejs/kit';
import { errorText } from '#lib/copy.js';
import { toPoisha } from '#lib/money.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const [zones, districts] = await Promise.all([
		locals.api.GET('/v1/admin/shipping-zones'),
		locals.api.GET('/v1/districts')
	]);
	if (!zones.data) error(zones.response.status, errorText(zones.error?.error.code));
	if (!districts.data) error(districts.response.status, errorText(districts.error?.error.code));
	return { zones: zones.data.items, districts: districts.data.items };
};

// Amounts are typed in taka and kilograms; the API takes poisha and grams.
function input(form: FormData) {
	const taka = (k: string) => Number(form.get(k) ?? 0) || 0;
	const free = String(form.get('free_over') ?? '').trim();
	return {
		name: String(form.get('name') ?? '').trim(),
		delivery_days: String(form.get('delivery_days') ?? '').trim(),
		districts: form.getAll('districts').map(String),
		base_charge: toPoisha(taka('base_charge')),
		base_weight_g: Math.round((Number(form.get('base_weight_kg')) || 1) * 1000),
		extra_per_kg: toPoisha(taka('extra_per_kg')),
		free_over: free && Number(free) > 0 ? toPoisha(Number(free)) : null,
		position: Number(form.get('position') ?? 0) || 0,
		active: form.has('active')
	};
}

const failure = (
	action: string,
	err?: { error: { code: string; fields?: Record<string, string> } }
) => fail(400, { action, fields: err?.error.fields ?? {}, message: errorText(err?.error.code) });

export const actions: Actions = {
	create: async ({ request, locals }) => {
		const { data, error: err } = await locals.api.POST('/v1/admin/shipping-zones', {
			body: input(await request.formData())
		});
		if (!data) return failure('create', err);
		return { action: 'create', saved: true };
	},
	update: async ({ request, locals }) => {
		const form = await request.formData();
		const { data, error: err } = await locals.api.PUT('/v1/admin/shipping-zones/{id}', {
			params: { path: { id: String(form.get('id')) } },
			body: input(form)
		});
		if (!data) return failure('update', err);
		return { action: 'update', saved: true };
	},
	delete: async ({ request, locals }) => {
		const id = String((await request.formData()).get('id'));
		const { error: err } = await locals.api.DELETE('/v1/admin/shipping-zones/{id}', {
			params: { path: { id } }
		});
		if (err) return failure('delete', err);
		return { action: 'delete', saved: true };
	}
};
