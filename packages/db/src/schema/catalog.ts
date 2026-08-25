import {
	pgTable, text, integer, boolean, index, uniqueIndex, primaryKey
} from 'drizzle-orm/pg-core';
import { tsCol, timestamps } from './common.ts';
import { media } from './store.ts';

// Prices are minor units of the store's currency (`setting.currency`).

export const brand = pgTable(
	'brand',
	{
		id: text().primaryKey(),
		name: text().notNull(),
		slug: text().notNull(),
		description: text(),
		logoMediaId: text().references(() => media.id, { onDelete: 'set null' }),
		isActive: boolean().notNull().default(true),
		...timestamps
	},
	(t) => [uniqueIndex('brand_slug_idx').on(t.slug)]
);

// Materialized path, not nested sets: `path` is '/root/child/leaf/' built from ids. Reordering
// is a string update and ancestor queries are a LIKE prefix.
export const category = pgTable(
	'category',
	{
		id: text().primaryKey(),
		parentId: text(),
		path: text().notNull(),
		depth: integer().notNull().default(0),
		name: text().notNull(),
		slug: text().notNull(),
		description: text(),
		imageMediaId: text().references(() => media.id, { onDelete: 'set null' }),
		sort: integer().notNull().default(0),
		isActive: boolean().notNull().default(true),
		metaTitle: text(),
		metaDescription: text(),
		...timestamps
	},
	(t) => [
		uniqueIndex('category_slug_idx').on(t.slug),
		index('category_path_idx').on(t.path),
		index('category_parent_idx').on(t.parentId)
	]
);

export const product = pgTable(
	'product',
	{
		id: text().primaryKey(),
		title: text().notNull(),
		slug: text().notNull(),
		description: text(),
		/** Short line for cards and meta descriptions. */
		summary: text(),
		brandId: text().references(() => brand.id, { onDelete: 'set null' }),
		/** One primary category for breadcrumbs and URLs; collections do the rest. */
		categoryId: text().references(() => category.id, { onDelete: 'set null' }),
		status: text({ enum: ['draft', 'active', 'archived'] })
			.notNull()
			.default('draft'),
		publishedAt: tsCol('published_at'),
		metaTitle: text(),
		metaDescription: text(),
		/** Set by the importer so a re-run updates instead of duplicating. */
		source: text(),
		externalId: text('external_id'),
		...timestamps
	},
	(t) => [
		uniqueIndex('product_slug_idx').on(t.slug),
		index('product_status_idx').on(t.status, t.publishedAt),
		index('product_category_idx').on(t.categoryId),
		uniqueIndex('product_source_idx').on(t.source, t.externalId)
	]
);

/** e.g. "Size". Options belong to one product; their order drives the picker. */
export const option = pgTable(
	'option',
	{
		id: text().primaryKey(),
		productId: text()
			.notNull()
			.references(() => product.id, { onDelete: 'cascade' }),
		name: text().notNull(),
		position: integer().notNull().default(0)
	},
	(t) => [index('option_product_idx').on(t.productId)]
);

/** e.g. "XL", or "Maroon" with a swatch the fashion theme renders. */
export const optionValue = pgTable(
	'option_value',
	{
		id: text().primaryKey(),
		optionId: text()
			.notNull()
			.references(() => option.id, { onDelete: 'cascade' }),
		value: text().notNull(),
		swatchHex: text('swatch_hex'),
		position: integer().notNull().default(0)
	},
	(t) => [index('option_value_option_idx').on(t.optionId)]
);

export const variant = pgTable(
	'variant',
	{
		id: text().primaryKey(),
		productId: text()
			.notNull()
			.references(() => product.id, { onDelete: 'cascade' }),
		sku: text(),
		barcode: text(),
		priceMinor: integer('price_minor').notNull(),
		/** Struck-through "was" price. Null means no discount is shown. */
		compareAtMinor: integer('compare_at_minor'),
		/** Purchase price, for margin reporting. Never exposed to the storefront. */
		costMinor: integer('cost_minor'),
		stockOnHand: integer('stock_on_hand').notNull().default(0),
		/** Held by in-flight checkouts. Available = on_hand - reserved. */
		stockReserved: integer('stock_reserved').notNull().default(0),
		/** Sell past zero — for made-to-order and pre-orders. */
		allowBackorder: boolean('allow_backorder').notNull().default(false),
		weightGrams: integer('weight_grams'),
		position: integer().notNull().default(0),
		isActive: boolean().notNull().default(true),
		source: text(),
		externalId: text('external_id'),
		...timestamps
	},
	(t) => [
		index('variant_product_idx').on(t.productId),
		uniqueIndex('variant_sku_idx').on(t.sku),
		uniqueIndex('variant_source_idx').on(t.source, t.externalId)
	]
);

/** Which option values this variant is: Size=XL + Colour=Maroon. */
export const variantOptionValue = pgTable(
	'variant_option_value',
	{
		variantId: text()
			.notNull()
			.references(() => variant.id, { onDelete: 'cascade' }),
		optionValueId: text()
			.notNull()
			.references(() => optionValue.id, { onDelete: 'cascade' })
	},
	(t) => [
		primaryKey({ columns: [t.variantId, t.optionValueId] }),
		index('vov_value_idx').on(t.optionValueId)
	]
);

export const productMedia = pgTable(
	'product_media',
	{
		productId: text()
			.notNull()
			.references(() => product.id, { onDelete: 'cascade' }),
		mediaId: text()
			.notNull()
			.references(() => media.id, { onDelete: 'cascade' }),
		/** Optional: pin an image to one variant, so picking a colour swaps it. */
		variantId: text().references(() => variant.id, { onDelete: 'cascade' }),
		position: integer().notNull().default(0)
	},
	(t) => [
		primaryKey({ columns: [t.productId, t.mediaId] }),
		index('product_media_order_idx').on(t.productId, t.position)
	]
);

export const collection = pgTable(
	'collection',
	{
		id: text().primaryKey(),
		name: text().notNull(),
		slug: text().notNull(),
		description: text(),
		imageMediaId: text().references(() => media.id, { onDelete: 'set null' }),
		isActive: boolean().notNull().default(true),
		metaTitle: text(),
		metaDescription: text(),
		...timestamps
	},
	(t) => [uniqueIndex('collection_slug_idx').on(t.slug)]
);

export const collectionProduct = pgTable(
	'collection_product',
	{
		collectionId: text()
			.notNull()
			.references(() => collection.id, { onDelete: 'cascade' }),
		productId: text()
			.notNull()
			.references(() => product.id, { onDelete: 'cascade' }),
		position: integer().notNull().default(0)
	},
	(t) => [
		primaryKey({ columns: [t.collectionId, t.productId] }),
		index('collection_product_order_idx').on(t.collectionId, t.position)
	]
);

// Slugs change and links must not rot. Every slug edit writes a row here and the storefront
// 301s from the old path.
export const redirect = pgTable(
	'redirect',
	{
		id: text().primaryKey(),
		fromPath: text('from_path').notNull(),
		toPath: text('to_path').notNull(),
		statusCode: integer('status_code').notNull().default(301),
		hits: integer().notNull().default(0),
		...timestamps
	},
	(t) => [uniqueIndex('redirect_from_idx').on(t.fromPath)]
);
