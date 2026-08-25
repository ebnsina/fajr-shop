import { pgTable, text, timestamp, integer, index } from 'drizzle-orm/pg-core';

// Leads from the marketing site. This is the company's own list, not a
// merchant's data, so it lives in its own database away from any shop.
export const lead = pgTable(
	'lead',
	{
		id: text().primaryKey(),
		// 'demo' or 'contact' — the two ways someone reaches us.
		kind: text().notNull(),
		// Which demo shop they asked for, when the lead came from one.
		demo: text(),
		name: text().notNull(),
		// Normalised to +8801XXXXXXXXX so the same person cannot appear twice.
		phone: text().notNull(),
		shop: text(),
		ordersBand: text(),
		selling: text(),
		message: text(),
		// Bumped on every repeat submission instead of inserting a duplicate.
		touches: integer().notNull().default(1),
		firstSeenAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
		lastSeenAt: timestamp({ withTimezone: true }).notNull().defaultNow()
	},
	(t) => [index('lead_last_seen_idx').on(t.lastSeenAt)]
);
