import { error, redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals, url }) => {
	const { data, response } = await locals.api.GET('/v1/me');
	if (response.status === 401)
		redirect(303, `/admin/login?next=${encodeURIComponent(url.pathname)}`);
	if (!data) error(response.status, 'Could not load your account');
	if (data.role === 'customer') redirect(303, '/admin/login');
	return { user: data };
};
