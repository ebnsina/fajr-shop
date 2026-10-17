import type { Cookies } from '@sveltejs/kit';
import type { components } from '#lib/api.js';
import { clearCartToken, readCartToken, readSaved, saveSaved, saveSession } from './session.js';

/** Keeps a new session and folds the guest's bag and saved items into the customer's account. */
export async function startSession(
	api: App.Locals['api'],
	cookies: Cookies,
	session: components['schemas']['Session']
) {
	saveSession(cookies, session, true);
	const headers = { Authorization: `Bearer ${session.access_token}` };
	const saved = readSaved(cookies);
	if (saved.length) {
		const results = await Promise.all(
			saved.map((id) =>
				api.PUT('/v1/wishlist/{product_id}', { params: { path: { product_id: id } }, headers })
			)
		);
		// Any that didn't move (a product since removed) stay out of the cookie too; nothing to keep.
		if (results.every((r) => r.response.ok || r.response.status === 404)) saveSaved(cookies, []);
	}
	const guestCart = readCartToken(cookies);
	if (!guestCart) return;
	const { response } = await api.POST('/v1/cart/merge', {
		body: { cart_token: guestCart },
		headers
	});
	// A failed merge leaves the guest's bag where it was; it can be merged on the next sign-in.
	if (response.ok) clearCartToken(cookies);
}
