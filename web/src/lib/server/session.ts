import type { Cookies } from '@sveltejs/kit';
import type { components } from '#lib/api.js';

type Session = components['schemas']['Session'];

// Tokens live only in httpOnly cookies; page scripts never see them.
const ACCESS = 'fs_access';
const REFRESH = 'fs_refresh';
const KEEP = 'fs_keep';
const base = { path: '/', httpOnly: true, sameSite: 'lax' } as const;

const secondsUntil = (iso: string) =>
	Math.max(0, Math.floor((Date.parse(iso) - Date.now()) / 1000));

export function readSession(cookies: Cookies) {
	return {
		access: cookies.get(ACCESS),
		refresh: cookies.get(REFRESH),
		keep: cookies.get(KEEP) === '1'
	};
}

/** keep: survive closing the browser ("Keep me signed in"). */
export function saveSession(cookies: Cookies, s: Session, keep: boolean) {
	// Expires a little early, so a request never arrives with a token the API has just retired.
	cookies.set(ACCESS, s.access_token, {
		...base,
		maxAge: Math.max(0, secondsUntil(s.access_expires_at) - 30)
	});
	const refreshAge = keep ? { maxAge: secondsUntil(s.refresh_expires_at) } : {};
	cookies.set(REFRESH, s.refresh_token, { ...base, ...refreshAge });
	if (keep) cookies.set(KEEP, '1', { ...base, ...refreshAge });
	else cookies.delete(KEEP, { path: '/' });
}

export function clearSession(cookies: Cookies) {
	for (const name of [ACCESS, REFRESH, KEEP]) cookies.delete(name, { path: '/' });
}

// A guest's cart token. Signed-in customers' carts are found by their session instead.
const CART = 'fs_cart';
export const readCartToken = (cookies: Cookies) => cookies.get(CART);
export const saveCartToken = (cookies: Cookies, token: string) =>
	cookies.set(CART, token, { ...base, maxAge: 60 * 24 * 60 * 60 });

export const clearCartToken = (cookies: Cookies) => cookies.delete(CART, { path: '/' });
