import type { MiddlewareHandler } from 'hono';
import { randomUUID } from 'node:crypto';

/** Request id threaded end to end. Costs nothing now; it's the difference
 *  between debugging and guessing once traffic is real. */
export const requestId: MiddlewareHandler = async (c, next) => {
	const id = c.req.header('x-request-id') ?? randomUUID();
	c.set('requestId', id);
	c.header('x-request-id', id);
	await next();
};

export const logger: MiddlewareHandler = async (c, next) => {
	const started = performance.now();
	await next();
	console.log(
		JSON.stringify({
			t: new Date().toISOString(),
			requestId: c.get('requestId'),
			method: c.req.method,
			path: c.req.path,
			status: c.res.status,
			ms: Math.round(performance.now() - started)
		})
	);
};
