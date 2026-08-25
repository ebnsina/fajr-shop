import { db, outbox, sql, eq } from '@fajr/db';

export type Handler = (payload: Record<string, unknown>) => Promise<void>;

const MAX_ATTEMPTS = 5;

// Claims a batch with FOR UPDATE SKIP LOCKED, so two workers can run against one table without.
export async function drain(handlers: Record<string, Handler>, batch = 20): Promise<number> {
	const rows = (await db.write.execute(sql`
		with claimed as (
			select id from outbox
			where processed_at is null and attempts < ${MAX_ATTEMPTS}
			order by created_at
			limit ${batch}
			for update skip locked
		)
		update outbox o
		set attempts = o.attempts + 1
		from claimed
		where o.id = claimed.id
		returning o.id, o.topic, o.payload, o.attempts
	`)) as unknown as {
		id: string;
		topic: string;
		payload: Record<string, unknown>;
		attempts: number;
	}[];

	for (const row of rows) {
		const handler = handlers[row.topic];

		if (!handler) {
			// Nothing consumes this topic yet. Park it rather than retrying
			// forever — a future consumer can be backfilled from these rows.
			await db.write
				.update(outbox)
				.set({ processedAt: new Date(), lastError: 'no handler' })
				.where(eq(outbox.id, row.id));
			continue;
		}

		try {
			await handler(row.payload);
			await db.write
				.update(outbox)
				.set({ processedAt: new Date(), lastError: null })
				.where(eq(outbox.id, row.id));
		} catch (err) {
			// The attempt counter is already incremented, so a permanently broken
			// row stops after MAX_ATTEMPTS instead of spinning.
			await db.write
				.update(outbox)
				.set({ lastError: String(err) })
				.where(eq(outbox.id, row.id));
			console.error(
				JSON.stringify({
					t: new Date().toISOString(),
					outbox: row.id,
					topic: row.topic,
					attempt: row.attempts,
					err: String(err)
				})
			);
		}
	}

	return rows.length;
}
