import { db, rateLimit, sql } from '@fajr/db';

export type LimitResult = { allowed: boolean; remaining: number; retryAfterMs: number };

// Postgres counter table, not Redis. One upsert, one round trip. Redis only when these rows
// show real contention — see the "not yet" table in the plan.
export async function consume(key: string, limit: number, windowMs: number): Promise<LimitResult> {
	const expired = sql`${rateLimit.windowStart} < now() - make_interval(secs => ${windowMs / 1000})`;
	const [row] = await db.write
		.insert(rateLimit)
		.values({ key, count: 1 })
		.onConflictDoUpdate({
			target: rateLimit.key,
			set: {
				count: sql`case when ${expired} then 1 else ${rateLimit.count} + 1 end`,
				windowStart: sql`case when ${expired} then now() else ${rateLimit.windowStart} end`
			}
		})
		.returning();

	const count = row?.count ?? 1;
	const started = row?.windowStart?.getTime() ?? Date.now();
	return {
		allowed: count <= limit,
		remaining: Math.max(0, limit - count),
		retryAfterMs: Math.max(0, started + windowMs - Date.now())
	};
}
