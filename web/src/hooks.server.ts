import { FAJR_API_URL } from '$app/env/private';
import type { Handle } from '@sveltejs/kit/hooks';
import createClient from 'openapi-fetch';
import type { components, paths } from '#lib/api.js';
import { clearSession, readSession, saveSession } from '#lib/server/session.js';

type Session = components['schemas']['Session'];

// One refresh per refresh token, shared by requests that race with it. Each token works once at
// the API, so a second refresh with the same token would sign the person out.
// ponytail: in-process, assumes one web server per shop.
const refreshing = new Map<string, Promise<Session | undefined>>();

function refreshOnce(token: string, ip: string) {
	let pending = refreshing.get(token);
	if (!pending) {
		const api = createClient<paths>({
			baseUrl: FAJR_API_URL,
			headers: { 'X-Forwarded-For': ip }
		});
		pending = api.POST('/v1/auth/refresh', { body: { refresh_token: token } }).then((r) => r.data);
		refreshing.set(token, pending);
		// Kept briefly so requests already in flight with the old cookie get the same answer.
		setTimeout(() => refreshing.delete(token), 30_000);
	}
	return pending;
}

export const handle: Handle = async ({ event, resolve }) => {
	const ip = event.getClientAddress();
	let { access, refresh, keep } = readSession(event.cookies);

	if (!access && refresh) {
		const session = await refreshOnce(refresh, ip);
		if (session) {
			saveSession(event.cookies, session, keep);
			access = session.access_token;
		} else {
			clearSession(event.cookies);
		}
	}

	event.locals.api = createClient<paths>({
		baseUrl: FAJR_API_URL,
		headers: {
			'X-Forwarded-For': ip,
			...(access && { Authorization: `Bearer ${access}` })
		}
	});
	return resolve(event);
};
