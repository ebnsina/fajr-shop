import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { adminLogin } from '@fajr/schemas';
import { login, getStaff } from '@fajr/core/staff';
import { revokeSession } from '@fajr/core/auth';
import type { Env } from '../app.ts';
import { readToken, requireAdmin, setSessionCookie, clearSessionCookie } from '../auth.ts';

const staffShape = z.object({
	id: z.string(),
	email: z.string(),
	name: z.string(),
	roleId: z.string(),
	permissions: z.array(z.string())
});

const json = (schema: z.ZodTypeAny, description: string) => ({
	description,
	content: { 'application/json': { schema } }
});

export const authRoutes = new OpenAPIHono<Env>();

authRoutes.openapi(
	createRoute({
		method: 'post',
		path: '/api/v1/auth/admin/login',
		summary: 'Staff login',
		tags: ['auth'],
		request: { body: { content: { 'application/json': { schema: adminLogin } } } },
		responses: {
			200: json(z.object({ staff: staffShape, token: z.string(), expiresAt: z.string() }), 'Signed in'),
			401: json(z.object({ error: z.string() }), 'Bad credentials'),
			429: json(z.object({ error: z.string() }), 'Too many attempts')
		}
	}),
	async (c) => {
		const { email, password } = c.req.valid('json');
		const result = await login(email, password, {
			ip: c.req.header('cf-connecting-ip') ?? c.req.header('x-forwarded-for') ?? null,
			userAgent: c.req.header('user-agent') ?? null,
			requestId: c.get('requestId')
		});

		if (!result.ok) {
			if (result.reason === 'rate_limited') return c.json({ error: 'too_many_attempts' }, 429);
			return c.json({ error: 'invalid_credentials' }, 401);
		}

		setSessionCookie(c as never, result.token, result.expiresAt);
		return c.json({
			staff: result.staff,
			token: result.token, // for non-browser clients; the cookie covers the web
			expiresAt: result.expiresAt.toISOString()
		});
	}
);

authRoutes.openapi(
	createRoute({
		method: 'post',
		path: '/api/v1/auth/logout',
		summary: 'Sign out this session',
		tags: ['auth'],
		responses: { 200: json(z.object({ ok: z.literal(true) }), 'Signed out') }
	}),
	async (c) => {
		const token = readToken(c);
		if (token) await revokeSession(token);
		clearSessionCookie(c as never);
		return c.json({ ok: true as const });
	}
);

authRoutes.use('/api/v1/auth/me', requireAdmin);
authRoutes.openapi(
	createRoute({
		method: 'get',
		path: '/api/v1/auth/me',
		summary: 'Current staff member',
		tags: ['auth'],
		responses: {
			200: json(staffShape, 'The signed-in staff member'),
			401: json(z.object({ error: z.string() }), 'Not signed in')
		}
	}),
	async (c) => {
		const staff = await getStaff(c.get('user')!.userId);
		if (!staff) return c.json({ error: 'unauthorized' }, 401);
		return c.json(staff);
	}
);
