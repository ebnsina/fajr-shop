import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema/index.ts';

export * from './schema/index.ts';
export * from './id.ts';
export { sql, eq, and, or, lt, gt, gte, lte, desc, asc, inArray, isNull } from 'drizzle-orm';

// Connected on first use, not on import.
let client: ReturnType<typeof postgres> | undefined;
let instance: ReturnType<typeof drizzle<typeof schema>> | undefined;

function connect() {
	if (instance) return instance;

	const url = process.env.DATABASE_URL;
	if (!url) throw new Error('DATABASE_URL is not set');

	// Pool at ~2-3x cores. Connection count is what cracks first, not req/s.
	client = postgres(url, { max: Number(process.env.DB_POOL_MAX ?? 10) });
	instance = drizzle(client, { schema, casing: 'snake_case' });
	return instance;
}

export type Db = ReturnType<typeof connect>;

// Reads and writes are marked at the call site so a read replica is later a config change, not
// an audit of every query. Both point at one connection today.
export const db = {
	get read(): Db {
		return connect();
	},
	get write(): Db {
		return connect();
	},
	/** Escape hatch for transactions, which span both. */
	tx: <T>(fn: Parameters<Db['transaction']>[0]) => connect().transaction(fn) as Promise<T>,
	close: () => client?.end() ?? Promise.resolve()
};
export { schema };
