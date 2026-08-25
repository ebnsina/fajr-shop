import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { adminLogin } from '@fajr/schemas';
import { login } from '@fajr/core/staff';
import { setSessionCookie, clientIp } from '$lib/server/session';

export const load: PageServerLoad = ({ locals, url }) => {
	if (locals.staff) redirect(303, url.searchParams.get('next') ?? '/admin');
	return {};
};

export const actions: Actions = {
	default: async ({ request, cookies, url, locals, getClientAddress }) => {
		const form = await request.formData();
		const email = String(form.get('email') ?? '');

		const parsed = adminLogin.safeParse({ email, password: form.get('password') });
		if (!parsed.success) return fail(400, { email, error: 'Enter your email and password.' });

		const result = await login(parsed.data.email, parsed.data.password, {
			ip: clientIp(request, getClientAddress()),
			userAgent: request.headers.get('user-agent'),
			requestId: locals.requestId
		});

		if (!result.ok) {
			// Never say which half was wrong — that turns login into an account oracle.
			const error =
				result.reason === 'rate_limited'
					? 'Too many attempts. Try again in a few minutes.'
					: 'Email or password is incorrect.';
			return fail(result.reason === 'rate_limited' ? 429 : 401, { email, error });
		}

		setSessionCookie(cookies, result.token, result.expiresAt);

		const next = url.searchParams.get('next');
		redirect(303, next?.startsWith('/admin') ? next : '/admin');
	}
};
