import type { Cookies } from '@sveltejs/kit';
import type { components } from '#lib/api.js';
import { clearCartToken, readCartToken, saveSession } from './session.js';

/** Keeps a new session and folds the guest's bag into the customer's, as one step after sign-in. */
export async function startSession(
	api: App.Locals['api'],
	cookies: Cookies,
	session: components['schemas']['Session']
) {
	saveSession(cookies, session, true);
	const guestCart = readCartToken(cookies);
	if (!guestCart) return;
	const { response } = await api.POST('/v1/cart/merge', {
		body: { cart_token: guestCart },
		headers: { Authorization: `Bearer ${session.access_token}` }
	});
	// A failed merge leaves the guest's bag where it was; it can be merged on the next sign-in.
	if (response.ok) clearCartToken(cookies);
}
