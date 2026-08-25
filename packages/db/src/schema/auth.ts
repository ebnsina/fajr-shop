import { pgTable, text, integer, boolean, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { tsCol, timestamps } from './common.ts';

export const role = pgTable('role', {
	id: text().primaryKey(),
	name: text().notNull(),
	/** Flat permission slugs, e.g. 'order.read'. No join table until roles get complicated. */
	permissions: text().array().notNull().default([]),
	...timestamps
});

export const adminUser = pgTable(
	'admin_user',
	{
		id: text().primaryKey(),
		email: text().notNull(),
		passwordHash: text().notNull(),
		name: text().notNull(),
		roleId: text()
			.notNull()
			.references(() => role.id),
		isActive: boolean().notNull().default(true),
		lastLoginAt: tsCol('last_login_at'),
		...timestamps
	},
	(t) => [uniqueIndex('admin_user_email_idx').on(t.email)]
);

export const customer = pgTable(
	'customer',
	{
		id: text().primaryKey(),
		/** Primary identity in BD. Email is optional and often absent. */
		phoneE164: text('phone_e164').notNull(),
		name: text(),
		email: text(),
		isBlacklisted: boolean().notNull().default(false),
		note: text(),
		...timestamps
	},
	(t) => [uniqueIndex('customer_phone_idx').on(t.phoneE164)]
);

// `id` is the SHA-256 hash of the token we hand out, never the token itself — a leaked dump
// cannot be replayed as live sessions.
export const session = pgTable(
	'session',
	{
		id: text().primaryKey(),
		userId: text().notNull(),
		userType: text({ enum: ['admin', 'customer'] }).notNull(),
		expiresAt: tsCol('expires_at').notNull(),
		createdAt: tsCol('created_at').notNull().defaultNow(),
		ip: text(),
		userAgent: text('user_agent')
	},
	(t) => [index('session_user_idx').on(t.userType, t.userId)]
);

/** One live OTP per phone. Code is hashed at rest, like the session token. */
export const otp = pgTable(
	'otp',
	{
		phoneE164: text('phone_e164').primaryKey(),
		codeHash: text().notNull(),
		expiresAt: tsCol('expires_at').notNull(),
		attempts: integer().notNull().default(0),
		createdAt: tsCol('created_at').notNull().defaultNow()
	}
);

/** Postgres-backed rate limiting. No Redis until these rows show contention. */
export const rateLimit = pgTable(
	'rate_limit',
	{
		/** e.g. 'otp:send:phone:+8801...' or 'otp:send:ip:1.2.3.4' */
		key: text().primaryKey(),
		count: integer().notNull().default(0),
		windowStart: tsCol('window_start').notNull().defaultNow()
	}
);
