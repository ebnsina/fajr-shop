import { redirect } from '@sveltejs/kit';
import { clearSession } from '#lib/server/session.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent }) => {
	const { me } = await parent();
	if (!me) redirect(303, '/account/login?next=/account');
	return { me };
};

export const actions: Actions = {
	signout: async ({ locals, cookies }) => {
		await locals.api.POST('/v1/auth/logout').catch(() => undefined);
		clearSession(cookies);
		redirect(303, '/');
	}
};
