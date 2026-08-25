import { redirect } from '@sveltejs/kit';
import type { Actions } from './$types';
import { revokeSession } from '@fajr/core/auth';
import { SESSION_COOKIE, clearSessionCookie } from '$lib/server/session';

export const actions: Actions = {
	default: async ({ cookies }) => {
		const token = cookies.get(SESSION_COOKIE);
		if (token) await revokeSession(token);
		clearSessionCookie(cookies);
		redirect(303, '/admin/login');
	}
};
