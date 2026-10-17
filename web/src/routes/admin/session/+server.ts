import { json } from '@sveltejs/kit';
import { clearSession, saveSession } from '#lib/server/session.js';
import type { RequestHandler } from './$types';

// Signs in to the dashboard and keeps the tokens in cookies; the page only learns whether it worked.
export const POST: RequestHandler = async ({ request, locals, cookies }) => {
	const body = await request.json().catch(() => null);
	if (typeof body?.email !== 'string' || typeof body?.password !== 'string') {
		return json({ code: 'validation' }, { status: 400 });
	}
	const { data, error, response } = await locals.api.POST('/v1/auth/login', {
		body: { login: body.email, password: body.password }
	});
	if (!data) return json({ code: error?.error.code ?? 'internal' }, { status: response.status });
	if (data.user.role === 'customer') return json({ code: 'not_staff' }, { status: 403 });

	saveSession(cookies, data, body.remember === true);
	return new Response(null, { status: 204 });
};

export const DELETE: RequestHandler = async ({ locals, cookies }) => {
	// Signed out here whatever the API says; a session it no longer knows is already over.
	await locals.api.POST('/v1/auth/logout').catch(() => undefined);
	clearSession(cookies);
	return new Response(null, { status: 204 });
};
