import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { requestId, logger } from './middleware.ts';
import { withSession, type SessionUser } from './auth.ts';
import { authRoutes } from './routes/auth.ts';
import { mediaRoutes } from './routes/media.ts';
import { storeRoutes } from './routes/store.ts';
import { catalogRoutes } from './routes/catalog.ts';
import { cartRoutes } from './routes/cart.ts';
import { checkoutRoutes } from './routes/checkout.ts';

export type Env = { Variables: { requestId: string; user: SessionUser | null } };

export const app = new OpenAPIHono<Env>();

app.use('*', requestId);
app.use('*', logger);
app.use('*', withSession);

app.route('/', authRoutes);
app.route('/', mediaRoutes);
app.route('/', storeRoutes);
app.route('/', catalogRoutes);
app.route('/', cartRoutes);
app.route('/', checkoutRoutes);

app.openapi(
	createRoute({
		method: 'get',
		path: '/api/v1/health',
		summary: 'Liveness probe',
		tags: ['system'],
		responses: {
			200: {
				description: 'Service is up',
				content: {
					'application/json': {
						schema: z.object({ ok: z.literal(true), version: z.string() })
					}
				}
			}
		}
	}),
	(c) => c.json({ ok: true as const, version: process.env.APP_VERSION ?? 'dev' })
);

/** Spec is generated from the same Zod the handlers validate with, so it cannot drift. */
app.doc('/api/v1/openapi.json', {
	openapi: '3.1.0',
	info: { title: 'Fajr Shop API', version: '1.0.0' }
});
