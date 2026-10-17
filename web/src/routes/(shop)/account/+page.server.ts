import { redirect } from '@sveltejs/kit';
import { clearSession } from '#lib/server/session.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent, locals }) => {
	const { me } = await parent();
	if (!me) redirect(303, '/account/login?next=/account');
	const { data } = await locals.api.GET('/v1/orders');
	// Without the list the page still works; the orders card says it couldn't load.
	return { me, orders: data?.items ?? null };
};

export const actions: Actions = {
	signout: async ({ locals, cookies }) => {
		await locals.api.POST('/v1/auth/logout').catch(() => undefined);
		clearSession(cookies);
		redirect(303, '/');
	}
};
