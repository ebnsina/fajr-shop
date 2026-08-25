import { db, sql } from '@fajr/db';
import type { RequestHandler } from './$types';

// What a load balancer and an uptime check ask.
export const GET: RequestHandler = async ({ setHeaders }) => {
	setHeaders({ 'cache-control': 'no-store' });

	const started = performance.now();
	try {
		await db.read.execute(sql`select 1`);
		return new Response(
			JSON.stringify({
				ok: true,
				db: Math.round(performance.now() - started),
				version: process.env.APP_VERSION ?? 'dev'
			}),
			{ headers: { 'content-type': 'application/json' } }
		);
	} catch (err) {
		return new Response(JSON.stringify({ ok: false, error: String(err) }), {
			status: 503,
			headers: { 'content-type': 'application/json' }
		});
	}
};
