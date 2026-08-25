import {
	db, review, question, product, orderItem, order,
	newId, eq, and, sql, desc, inArray
} from '@fajr/db';
import { audit } from '../audit/index.ts';

export type ReviewInput = {
	productId: string;
	rating: number;
	title?: string | null;
	body: string;
	authorName: string;
	authorPhone: string;
};

export type PublicReview = {
	id: string;
	rating: number;
	title: string | null;
	body: string;
	authorName: string;
	isVerified: boolean;
	reply: string | null;
	createdAt: Date;
};

export type RatingSummary = {
	count: number;
	average: number;
	// Index 0 is one star, index 4 is five, so a bar chart reads straight off it.
	breakdown: [number, number, number, number, number];
};

// Only a phone with a delivered order containing this product earns the badge.
// Anyone may review; the badge is what carries the weight.
async function hasBought(productId: string, phone: string): Promise<boolean> {
	const [row] = await db.read
		.select({ n: sql<number>`count(*)::int` })
		.from(orderItem)
		.innerJoin(order, eq(order.id, orderItem.orderId))
		.where(
			and(
				eq(orderItem.productId, productId),
				eq(order.phoneE164, phone),
				eq(order.status, 'delivered')
			)
		);
	return (row?.n ?? 0) > 0;
}

export type SubmitResult =
	| { ok: true; status: 'pending' }
	| { ok: false; reason: 'bad_rating' | 'too_short' | 'no_product' };

export async function submitReview(input: ReviewInput): Promise<SubmitResult> {
	if (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5) {
		return { ok: false, reason: 'bad_rating' };
	}
	if (input.body.trim().length < 10) return { ok: false, reason: 'too_short' };

	const exists = await db.read.query.product.findFirst({
		columns: { id: true },
		where: eq(product.id, input.productId)
	});
	if (!exists) return { ok: false, reason: 'no_product' };

	const verified = (await hasBought(input.productId, input.authorPhone)) ? 'yes' : 'no';

	// Upsert: a second submission from the same phone edits the first rather
	// than stacking duplicates, and returns to moderation.
	await db.write
		.insert(review)
		.values({
			id: newId('rev'),
			productId: input.productId,
			rating: input.rating,
			title: input.title?.trim() || null,
			body: input.body.trim(),
			authorName: input.authorName.trim(),
			authorPhone: input.authorPhone,
			isVerified: verified
		})
		.onConflictDoUpdate({
			target: [review.productId, review.authorPhone],
			set: {
				rating: input.rating,
				title: input.title?.trim() || null,
				body: input.body.trim(),
				authorName: input.authorName.trim(),
				isVerified: verified,
				status: 'pending',
				updatedAt: sql`now()`
			}
		});

	return { ok: true, status: 'pending' };
}

export async function publishedReviews(productId: string, limit = 20): Promise<PublicReview[]> {
	const rows = await db.read
		.select({
			id: review.id,
			rating: review.rating,
			title: review.title,
			body: review.body,
			authorName: review.authorName,
			isVerified: review.isVerified,
			reply: review.reply,
			createdAt: review.createdAt
		})
		.from(review)
		.where(and(eq(review.productId, productId), eq(review.status, 'published')))
		.orderBy(desc(review.createdAt))
		.limit(limit);

	return rows.map((r) => ({ ...r, isVerified: r.isVerified === 'yes' }));
}

// One grouped query, not five counts: a product page must not pay per star.
export async function ratingSummary(productId: string): Promise<RatingSummary> {
	const rows = await db.read
		.select({ rating: review.rating, n: sql<number>`count(*)::int` })
		.from(review)
		.where(and(eq(review.productId, productId), eq(review.status, 'published')))
		.groupBy(review.rating);

	const breakdown: RatingSummary['breakdown'] = [0, 0, 0, 0, 0];
	let count = 0;
	let total = 0;
	for (const row of rows) {
		breakdown[row.rating - 1] = row.n;
		count += row.n;
		total += row.rating * row.n;
	}

	return { count, average: count ? Math.round((total / count) * 10) / 10 : 0, breakdown };
}

// Summaries for a whole grid in one query, so a listing does not go N+1.
export async function ratingsFor(productIds: string[]): Promise<Map<string, { count: number; average: number }>> {
	if (!productIds.length) return new Map();

	const rows = await db.read
		.select({
			productId: review.productId,
			n: sql<number>`count(*)::int`,
			avg: sql<number>`avg(${review.rating})::float`
		})
		.from(review)
		.where(and(inArray(review.productId, productIds), eq(review.status, 'published')))
		.groupBy(review.productId);

	return new Map(
		rows.map((r) => [r.productId, { count: r.n, average: Math.round(r.avg * 10) / 10 }])
	);
}

// ── questions ───────────────────────────────────────────────────────────────

export type PublicQuestion = {
	id: string;
	body: string;
	askedName: string;
	answer: string | null;
	answeredAt: Date | null;
	createdAt: Date;
};

export async function askQuestion(input: {
	productId: string;
	body: string;
	askedName: string;
	askedPhone: string;
}): Promise<{ ok: boolean; reason?: 'too_short' | 'no_product' }> {
	if (input.body.trim().length < 5) return { ok: false, reason: 'too_short' };

	const exists = await db.read.query.product.findFirst({
		columns: { id: true },
		where: eq(product.id, input.productId)
	});
	if (!exists) return { ok: false, reason: 'no_product' };

	await db.write.insert(question).values({
		id: newId('qst'),
		productId: input.productId,
		body: input.body.trim(),
		askedName: input.askedName.trim(),
		askedPhone: input.askedPhone
	});
	return { ok: true };
}

// Only answered questions are public: an unanswered wall reads as neglect.
export async function publishedQuestions(productId: string, limit = 20): Promise<PublicQuestion[]> {
	return db.read
		.select({
			id: question.id,
			body: question.body,
			askedName: question.askedName,
			answer: question.answer,
			answeredAt: question.answeredAt,
			createdAt: question.createdAt
		})
		.from(question)
		.where(and(eq(question.productId, productId), eq(question.status, 'published')))
		.orderBy(desc(question.answeredAt))
		.limit(limit);
}

// ── admin moderation ────────────────────────────────────────────────────────

export const pendingReviews = () =>
	db.read.select().from(review).where(eq(review.status, 'pending')).orderBy(desc(review.createdAt));

export const pendingQuestions = () =>
	db.read
		.select()
		.from(question)
		.where(eq(question.status, 'pending'))
		.orderBy(desc(question.createdAt));

export async function moderateReview(
	id: string,
	status: 'published' | 'rejected',
	ctx: { actorId?: string | null } = {}
) {
	await db.write.update(review).set({ status, updatedAt: sql`now()` }).where(eq(review.id, id));
	await audit({ actorType: 'admin', actorId: ctx.actorId ?? null, action: `review.${status}`, entity: 'review', entityId: id });
}

export async function replyToReview(id: string, reply: string, ctx: { actorId?: string | null } = {}) {
	await db.write
		.update(review)
		.set({
			reply: reply.trim() || null,
			repliedBy: ctx.actorId ?? null,
			repliedAt: sql`now()`,
			updatedAt: sql`now()`
		})
		.where(eq(review.id, id));
}

// Answering is what publishes a question; there is no separate approve step.
export async function answerQuestion(id: string, answer: string, ctx: { actorId?: string | null } = {}) {
	const text = answer.trim();
	await db.write
		.update(question)
		.set({
			answer: text || null,
			answeredBy: ctx.actorId ?? null,
			answeredAt: sql`now()`,
			status: text ? 'published' : 'pending',
			updatedAt: sql`now()`
		})
		.where(eq(question.id, id));
	await audit({ actorType: 'admin', actorId: ctx.actorId ?? null, action: 'question.answer', entity: 'question', entityId: id });
}

export async function rejectQuestion(id: string, ctx: { actorId?: string | null } = {}) {
	await db.write
		.update(question)
		.set({ status: 'rejected', updatedAt: sql`now()` })
		.where(eq(question.id, id));
	await audit({ actorType: 'admin', actorId: ctx.actorId ?? null, action: 'question.reject', entity: 'question', entityId: id });
}
