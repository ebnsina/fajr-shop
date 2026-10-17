import { fail, redirect } from '@sveltejs/kit';
import { errorText } from '#lib/copy.js';
import { startSession } from '#lib/server/signin.js';
import type { Actions } from './$types';

export const actions: Actions = {
	default: async ({ request, locals, cookies }) => {
		const form = await request.formData();
		const values = {
			name: String(form.get('name') ?? '').trim(),
			phone: String(form.get('phone') ?? '').trim(),
			email: String(form.get('email') ?? '').trim()
		};
		const { data, error } = await locals.api.POST('/v1/auth/register', {
			body: {
				name: values.name,
				phone: values.phone || undefined,
				email: values.email || undefined,
				password: String(form.get('password') ?? '')
			}
		});
		if (!data) {
			return fail(400, {
				values,
				fields: error?.error.fields ?? {},
				message: errorText(error?.error.code)
			});
		}
		await startSession(locals.api, cookies, data);
		redirect(303, '/account');
	}
};
