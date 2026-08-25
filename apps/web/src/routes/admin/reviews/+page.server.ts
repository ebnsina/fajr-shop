import { fail } from '@sveltejs/kit';
import { db, product, inArray } from '@fajr/db';
import {
	pendingReviews, pendingQuestions, moderateReview, replyToReview,
	answerQuestion, rejectQuestion
} from '@fajr/core/social';
import { guardActions, requirePermission } from '$lib/server/guard';

import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	requirePermission(locals, 'catalog.write');

	const [reviews, questions] = await Promise.all([pendingReviews(), pendingQuestions()]);

	// One lookup for every product mentioned, rather than one per row.
	const ids = [...new Set([...reviews, ...questions].map((r) => r.productId))];
	const rows = ids.length
		? await db.read
				.select({ id: product.id, title: product.title, slug: product.slug })
				.from(product)
				.where(inArray(product.id, ids))
		: [];
	const titles = new Map(rows.map((r) => [r.id, r]));

	return {
		reviews: reviews.map((r) => ({ ...r, product: titles.get(r.productId) ?? null })),
		questions: questions.map((q) => ({ ...q, product: titles.get(q.productId) ?? null }))
	};
};

export const actions: Actions = guardActions('catalog.write', {
	publish: async ({ request, locals }) => {
		const form = await request.formData();
		await moderateReview(String(form.get('id')), 'published', { actorId: locals.staff?.id });
		return { done: true };
	},

	reject: async ({ request, locals }) => {
		const form = await request.formData();
		await moderateReview(String(form.get('id')), 'rejected', { actorId: locals.staff?.id });
		return { done: true };
	},

	reply: async ({ request, locals }) => {
		const form = await request.formData();
		const text = String(form.get('reply') ?? '').trim();
		if (!text) return fail(400, { error: 'Write a reply first.' });

		const id = String(form.get('id'));
		await replyToReview(id, text, { actorId: locals.staff?.id });
		// Replying is an endorsement, so it publishes in the same step.
		await moderateReview(id, 'published', { actorId: locals.staff?.id });
		return { done: true };
	},

	answer: async ({ request, locals }) => {
		const form = await request.formData();
		const text = String(form.get('answer') ?? '').trim();
		if (!text) return fail(400, { error: 'Write an answer first.' });

		await answerQuestion(String(form.get('id')), text, { actorId: locals.staff?.id });
		return { done: true };
	},

	dismiss: async ({ request, locals }) => {
		const form = await request.formData();
		await rejectQuestion(String(form.get('id')), { actorId: locals.staff?.id });
		return { done: true };
	}
});
