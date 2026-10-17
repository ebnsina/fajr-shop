import { error, fail } from '@sveltejs/kit';
import type { components } from '#lib/api.js';
import { errorText } from '#lib/copy.js';
import type { Actions, PageServerLoad } from './$types';

type Role = components['schemas']['StaffRole'];
const role = (v: FormDataEntryValue | null): Role => (v === 'admin' ? 'admin' : 'staff');

export const load: PageServerLoad = async ({ locals }) => {
	const { data, error: err, response } = await locals.api.GET('/v1/admin/staff');
	if (!data) error(response.status, errorText(err?.error.code));
	return { team: data.items };
};

type Failure = { error: { code: string; message: string; fields?: Record<string, string> } };
const failure = (action: string, err?: Failure) =>
	fail(400, {
		action,
		fields: err?.error.fields ?? {},
		// "Someone already has an account…" reads well as it is; other codes get our wording.
		message: err?.error.code === 'account_exists' ? err.error.message : errorText(err?.error.code)
	});

export const actions: Actions = {
	add: async ({ request, locals }) => {
		const form = await request.formData();
		const phone = String(form.get('phone') ?? '').trim();
		const { data, error: err } = await locals.api.POST('/v1/admin/staff', {
			body: {
				name: String(form.get('name') ?? '').trim(),
				email: String(form.get('email') ?? '').trim(),
				phone: phone || null,
				role: role(form.get('role')),
				password: String(form.get('password') ?? '')
			}
		});
		if (!data) return failure('add', err);
		return { action: 'add', saved: true };
	},
	update: async ({ request, locals }) => {
		const form = await request.formData();
		const { data, error: err } = await locals.api.PUT('/v1/admin/staff/{id}', {
			params: { path: { id: String(form.get('id')) } },
			body: { role: role(form.get('role')), disabled: form.get('disabled') === '1' }
		});
		if (!data) return failure('update', err);
		return { action: 'update', saved: true };
	}
};
