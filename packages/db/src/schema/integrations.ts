import { pgTable, text, boolean, jsonb, index } from 'drizzle-orm/pg-core';
import { tsCol, timestamps } from './common.ts';

// One row per installed integration, keyed by the catalogue slug. Absent means
// never installed; present-and-disabled means installed but switched off, so a
// merchant can pause a courier without retyping their API keys.
export const integration = pgTable(
	'integration',
	{
		// Matches a slug in the core catalogue, e.g. 'pathao' or 'tap'.
		id: text().primaryKey(),
		kind: text({ enum: ['courier', 'payment', 'sms', 'chat', 'analytics'] }).notNull(),
		enabled: boolean().notNull().default(true),
		// Credentials and options. Never sent to the browser in full.
		config: jsonb().$type<Record<string, string>>().notNull().default({}),
		// Last time this integration's own health check succeeded.
		lastCheckedAt: tsCol('last_checked_at'),
		lastError: text('last_error'),
		installedAt: tsCol('installed_at').notNull().defaultNow(),
		...timestamps
	},
	(t) => [index('integration_kind_idx').on(t.kind, t.enabled)]
);
