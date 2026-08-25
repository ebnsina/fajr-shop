import { pgTable, text, integer, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { tsCol, timestamps } from './common.ts';
import { product } from './catalog.ts';
import { adminUser } from './auth.ts';

// Customer reviews. Moderated by default: this is public text on a merchant's
// own shop, and one abusive line costs more than ten honest ones earn.
export const review = pgTable(
	'review',
	{
		id: text().primaryKey(),
		productId: text()
			.notNull()
			.references(() => product.id, { onDelete: 'cascade' }),
		// 1–5. Enforced in core, not just here, so the API cannot bypass it.
		rating: integer().notNull(),
		title: text(),
		body: text().notNull(),
		authorName: text().notNull(),
		// Never shown. Used to match a delivered order and to rate-limit.
		authorPhone: text().notNull(),
		// True when this phone has a delivered order containing this product.
		isVerified: text({ enum: ['yes', 'no'] })
			.notNull()
			.default('no'),
		status: text({ enum: ['pending', 'published', 'rejected'] })
			.notNull()
			.default('pending'),
		// The merchant's public reply, shown under the review.
		reply: text(),
		repliedBy: text().references(() => adminUser.id, { onDelete: 'set null' }),
		repliedAt: tsCol('replied_at'),
		...timestamps
	},
	(t) => [
		index('review_product_idx').on(t.productId, t.status, t.createdAt),
		// One review per person per product; a second submission edits the first.
		uniqueIndex('review_product_phone_idx').on(t.productId, t.authorPhone)
	]
);

// Questions customers ask on the product page, and the merchant's answer.
export const question = pgTable(
	'question',
	{
		id: text().primaryKey(),
		productId: text()
			.notNull()
			.references(() => product.id, { onDelete: 'cascade' }),
		body: text().notNull(),
		askedName: text().notNull(),
		askedPhone: text().notNull(),
		answer: text(),
		answeredBy: text().references(() => adminUser.id, { onDelete: 'set null' }),
		answeredAt: tsCol('answered_at'),
		// A question is published once answered; unanswered ones stay private.
		status: text({ enum: ['pending', 'published', 'rejected'] })
			.notNull()
			.default('pending'),
		...timestamps
	},
	(t) => [index('question_product_idx').on(t.productId, t.status, t.createdAt)]
);
