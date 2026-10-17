import { fail, redirect } from '@sveltejs/kit';
import { errorText } from '#lib/copy.js';
import { startSession } from '#lib/server/signin.js';
import type { Actions } from './$types';

export const actions: Actions = {
	default: async ({ request, locals, cookies, url }) => {
		const form = await request.formData();
		const login = String(form.get('login') ?? '').trim();
		const password = String(form.get('password') ?? '');
		const { data, error } = await locals.api.POST('/v1/auth/login', { body: { login, password } });
		if (!data) return fail(400, { login, message: errorText(error?.error.code) });
		await startSession(locals.api, cookies, data);
		const next = url.searchParams.get('next') ?? '';
		redirect(303, next.startsWith('/') && !next.startsWith('//') ? next : '/account');
	}
};
