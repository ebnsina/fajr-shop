import { pgTable, text, integer, boolean, jsonb, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { tsCol, timestamps } from './common.ts';
import { adminUser } from './auth.ts';

// Exactly one row, id = 'default'. Not multi-tenant: every merchant is a separate deploy, so
// this is the whole per-merchant configuration surface.
export const setting = pgTable('setting', {
	id: text().primaryKey().default('default'),
	storeName: text().notNull().default('Fajr Shop'),
	logoMediaId: text(),
	/** ISO 4217. Every amount in the DB is minor units of this. */
	currency: text().notNull().default('BDT'),
	country: text().notNull().default('BD'),
	defaultLocale: text().notNull().default('bn'),
	timezone: text().notNull().default('Asia/Dhaka'),
	supportPhone: text(),
	supportEmail: text(),
	// Shown in the footer's contact column, e.g. "Sat–Thu, 10am–8pm".
	supportHours: text(),
	// One line describing the shop. Feeds the footer and the default meta description.
	tagline: text(),
	// The strip above the header. Empty hides it rather than showing someone else's promise.
	announcement: text(),
	/** Tax is a setting, not a constant: many BD merchants are not VAT registered. */
	vatRegistered: boolean().notNull().default(false),
	vatBin: text('vat_bin'),
	vatRateBp: integer('vat_rate_bp').notNull().default(0),
	vatInclusivePricing: boolean().notNull().default(false),
	theme: text({ enum: ['fashion', 'tech'] })
		.notNull()
		.default('fashion'),
	/** Which step of the first-run wizard is outstanding. null = finished. */
	setupStep: text('setup_step').default('store'),
	...timestamps
});

export const media = pgTable(
	'media',
	{
		id: text().primaryKey(),
		/** Object key in R2. Never a local path — the app process holds no state. */
		key: text().notNull(),
		mimeType: text().notNull(),
		sizeBytes: integer().notNull(),
		width: integer(),
		height: integer(),
		alt: text(),
		uploadedBy: text().references(() => adminUser.id),
		...timestamps
	},
	(t) => [index('media_created_idx').on(t.createdAt)]
);

export const auditLog = pgTable(
	'audit_log',
	{
		id: text().primaryKey(),
		actorType: text({ enum: ['admin', 'customer', 'system', 'agent'] }).notNull(),
		actorId: text(),
		action: text().notNull(),
		entity: text().notNull(),
		entityId: text(),
		/** Before/after diff, or the raw third-party payload for a lookup. */
		meta: jsonb().$type<Record<string, unknown>>(),
		ip: text(),
		requestId: text('request_id'),
		createdAt: tsCol('created_at').notNull().defaultNow()
	},
	(t) => [
		index('audit_entity_idx').on(t.entity, t.entityId),
		index('audit_created_idx').on(t.createdAt)
	]
);

// Side effects are rows, not calls. Written in the same transaction as the thing that caused
// them; workers fan out to SMS, push, CAPI, courier.
export const outbox = pgTable(
	'outbox',
	{
		id: text().primaryKey(),
		topic: text().notNull(),
		payload: jsonb().$type<Record<string, unknown>>().notNull(),
		/** Unique per (topic, key) so a retried producer can't enqueue twice. */
		idempotencyKey: text('idempotency_key').notNull(),
		processedAt: tsCol('processed_at'),
		attempts: integer().notNull().default(0),
		lastError: text('last_error'),
		createdAt: tsCol('created_at').notNull().defaultNow()
	},
	(t) => [
		index('outbox_unprocessed_idx').on(t.processedAt, t.createdAt),
		uniqueIndex('outbox_idem_idx').on(t.topic, t.idempotencyKey)
	]
);
