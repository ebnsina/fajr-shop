import { pgTable, text, integer, boolean, index, uniqueIndex, primaryKey } from 'drizzle-orm/pg-core';
import { timestamps } from './common.ts';
import { category, product } from './catalog.ts';

// Typed attributes per category — what makes a tech store work.
export const attribute = pgTable(
	'attribute',
	{
		id: text().primaryKey(),
		categoryId: text()
			.notNull()
			.references(() => category.id, { onDelete: 'cascade' }),
		name: text().notNull(),
		code: text().notNull(),
		unit: text(),
		/** Only some attributes are worth a filter; too many facets is noise. */
		isFilterable: boolean('is_filterable').notNull().default(true),
		sort: integer().notNull().default(0),
		...timestamps
	},
	(t) => [
		uniqueIndex('attribute_code_idx').on(t.categoryId, t.code),
		index('attribute_category_idx').on(t.categoryId, t.sort)
	]
);

export const productAttribute = pgTable(
	'product_attribute',
	{
		productId: text()
			.notNull()
			.references(() => product.id, { onDelete: 'cascade' }),
		attributeId: text()
			.notNull()
			.references(() => attribute.id, { onDelete: 'cascade' }),
		value: text().notNull()
	},
	(t) => [
		primaryKey({ columns: [t.productId, t.attributeId] }),
		// The index behind faceted filtering.
		index('product_attribute_facet_idx').on(t.attributeId, t.value)
	]
);
