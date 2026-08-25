import type { Cookies } from '@sveltejs/kit';
import { dev } from '$app/environment';

export const SESSION_COOKIE = 'sid';

export function setSessionCookie(cookies: Cookies, token: string, expiresAt: Date): void {
	cookies.set(SESSION_COOKIE, token, {
		httpOnly: true,
		secure: !dev,
		sameSite: 'lax', // SvelteKit blocks cross-origin form POSTs, so this covers CSRF
		path: '/',
		expires: expiresAt
	});
}

export const clearSessionCookie = (cookies: Cookies) => cookies.delete(SESSION_COOKIE, { path: '/' });

/** Behind Cloudflare the real client address is a header, not the socket. */
export const clientIp = (request: Request, fallback: string | null = null): string | null =>
	request.headers.get('cf-connecting-ip') ??
	request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
	fallback;
