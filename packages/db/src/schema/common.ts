import { timestamp } from 'drizzle-orm/pg-core';

/** Every timestamp is timestamptz in UTC. Display converts, storage never does. */
export const tsCol = (name: string) => timestamp(name, { withTimezone: true, mode: 'date' });

export const timestamps = {
	createdAt: tsCol('created_at').notNull().defaultNow(),
	updatedAt: tsCol('updated_at').notNull().defaultNow()
};
