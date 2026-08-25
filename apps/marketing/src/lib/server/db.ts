import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { env } from '$env/dynamic/private';
import * as schema from './schema';

let instance: ReturnType<typeof drizzle<typeof schema>> | undefined;

// Connected on first use: a build machine has no database, and throwing at
// import time would fail the build rather than the query.
export function db() {
	if (instance) return instance;

	const url = env.LEADS_DATABASE_URL;
	if (!url) throw new Error('LEADS_DATABASE_URL is not set — leads cannot be stored');

	instance = drizzle(postgres(url, { max: Number(env.LEADS_DB_POOL_MAX ?? 5) }), {
		schema,
		casing: 'snake_case'
	});
	return instance;
}
