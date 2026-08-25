import { pgTable, text, integer, boolean, jsonb, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { tsCol, timestamps } from './common.ts';
import { media } from './store.ts';

// A page is an ordered list of blocks. Campaign pages are needed weekly, by marketing, without
// a developer — so the content model has to be data, not components in the repo.
export const page = pgTable(
	'page',
	{
		id: text().primaryKey(),
		slug: text().notNull(),
		title: text().notNull(),
		status: text({ enum: ['draft', 'published'] })
			.notNull()
			.default('draft'),
		/** The storefront home. Exactly one page may hold it. */
		isHome: boolean('is_home').notNull().default(false),
		publishedAt: tsCol('published_at'),
		/** Sales end at midnight and nobody wants to be awake for it. */
		unpublishAt: tsCol('unpublish_at'),
		metaTitle: text(),
		metaDescription: text(),
		ogImageId: text().references(() => media.id, { onDelete: 'set null' }),
		/** A campaign page can run a different theme from the rest of the shop. */
		themeOverride: text('theme_override'),
		/** Per-page pixel: a landing page you cannot attribute is one you cannot optimise. */
		pixelId: text('pixel_id'),
		/** Random token so an unpublished draft can be shared for approval. */
		previewToken: text('preview_token').notNull(),
		...timestamps
	},
	(t) => [
		uniqueIndex('page_slug_idx').on(t.slug),
		index('page_status_idx').on(t.status, t.publishedAt)
	]
);

export const block = pgTable(
	'block',
	{
		id: text().primaryKey(),
		pageId: text()
			.notNull()
			.references(() => page.id, { onDelete: 'cascade' }),
		type: text().notNull(),
		/** Validated by the block's own Zod schema before it is ever written. */
		props: jsonb().$type<Record<string, unknown>>().notNull(),
		sort: integer().notNull().default(0),
		isVisible: boolean('is_visible').notNull().default(true),
		...timestamps
	},
	(t) => [index('block_page_idx').on(t.pageId, t.sort)]
);

/** Scheduled promotional images, placed by slot rather than by page. */
export const banner = pgTable(
	'banner',
	{
		id: text().primaryKey(),
		name: text().notNull(),
		slot: text().notNull(),
		mediaId: text().references(() => media.id, { onDelete: 'set null' }),
		mobileMediaId: text().references(() => media.id, { onDelete: 'set null' }),
		href: text(),
		alt: text(),
		startsAt: tsCol('starts_at'),
		endsAt: tsCol('ends_at'),
		sort: integer().notNull().default(0),
		isActive: boolean('is_active').notNull().default(true),
		...timestamps
	},
	(t) => [index('banner_slot_idx').on(t.slot, t.isActive, t.sort)]
);

/** Navigation, editable without a deploy. Self-referencing for submenus. */
export const menuItem = pgTable(
	'menu_item',
	{
		id: text().primaryKey(),
		menu: text().notNull().default('main'),
		parentId: text(),
		label: text().notNull(),
		href: text().notNull(),
		sort: integer().notNull().default(0),
		isActive: boolean('is_active').notNull().default(true),
		...timestamps
	},
	(t) => [index('menu_item_idx').on(t.menu, t.parentId, t.sort)]
);
