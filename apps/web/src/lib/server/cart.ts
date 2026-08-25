import type { Cookies } from '@sveltejs/kit';
import { dev } from '$app/environment';
import { cartFromToken, createCart } from '@fajr/core/cart';

export const CART_COOKIE = 'cart';
const MAX_AGE = 60 * 60 * 24 * 30;

/** Read-only: never mints a cart, so a bot crawling the site creates no rows. */
export const currentCart = (cookies: Cookies) => cartFromToken(cookies.get(CART_COOKIE));

/** Called only when something is actually being added. */
export async function ensureCart(cookies: Cookies): Promise<string> {
	const existing = await currentCart(cookies);
	if (existing) return existing;

	const { id, token } = await createCart();
	cookies.set(CART_COOKIE, token, {
		httpOnly: true,
		secure: !dev,
		sameSite: 'lax',
		path: '/',
		maxAge: MAX_AGE
	});
	return id;
}

export const clearCart = (cookies: Cookies) => cookies.delete(CART_COOKIE, { path: '/' });
