import type { MiddlewareHandler } from 'hono';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import { verifySession, type SessionUser } from '@fajr/core/auth';
import type { Env } from './app.ts';

export const SESSION_COOKIE = 'sid';

// Web sends the token as an httpOnly cookie, mobile sends the identical token as a Bearer
// header. One table, one revocation path, no refresh-token flow.
export function readToken(c: { req: { header: (k: string) => string | undefined } }): string | undefined {
	const header = c.req.header('authorization');
	if (header?.toLowerCase().startsWith('bearer ')) return header.slice(7).trim();
	return getCookie(c as never, SESSION_COOKIE);
}

/** Resolves the session if there is one. Never rejects — that's `requireAdmin`'s job. */
export const withSession: MiddlewareHandler<Env> = async (c, next) => {
	c.set('user', (await verifySession(readToken(c))) ?? null);
	await next();
};

export const requireAdmin: MiddlewareHandler<Env> = async (c, next) => {
	const user = c.get('user');
	if (!user || user.userType !== 'admin') return c.json({ error: 'unauthorized' }, 401);
	await next();
};

export function setSessionCookie(c: never, token: string, expiresAt: Date): void {
	setCookie(c, SESSION_COOKIE, token, {
		httpOnly: true,
		secure: process.env.NODE_ENV === 'production',
		sameSite: 'Lax', // with SvelteKit's cross-origin POST blocking, this covers CSRF
		path: '/',
		expires: expiresAt
	});
}

export const clearSessionCookie = (c: never) => deleteCookie(c, SESSION_COOKIE, { path: '/' });

export type { SessionUser };
