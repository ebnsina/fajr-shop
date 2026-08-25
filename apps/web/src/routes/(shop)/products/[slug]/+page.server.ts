import { error, fail, redirect } from '@sveltejs/kit';
import { productPage, findRedirect, specsFor, related } from '@fajr/core/catalog';
import {
	publishedReviews, ratingSummary, publishedQuestions, submitReview, askQuestion
} from '@fajr/core/social';
import { bdPhone } from '@fajr/schemas';
import { titled } from '$lib/meta';

import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, url, parent }) => {
	const { store } = await parent();
	const product = await productPage(params.slug);

	if (!product) {
		// Only on the miss path, so a renamed product costs one extra query
		// and a live one costs nothing.
		const moved = await findRedirect(url.pathname);
		if (moved) redirect(moved.status as 301, moved.to);
		error(404, 'Product not found');
	}

	// Everything the page below the fold needs, resolved together rather than
	// in five sequential awaits.
	const [specs, reviews, rating, questions, alsoLike] = await Promise.all([
		specsFor(product.id),
		publishedReviews(product.id),
		ratingSummary(product.id),
		publishedQuestions(product.id),
		related(product.id, product.category?.id ?? null)
	]);

	return {
		product,
		specs,
		reviews,
		rating,
		questions,
		alsoLike,
		meta: {
			title: titled(store.name, product.metaTitle ?? product.title),
			description: product.metaDescription ?? product.summary ?? undefined,
			type: 'product' as const,
			image: product.images[0]?.url ?? null
		}
	};
};

// Phone is the identity everywhere else in this product, so reuse it here.
const parsePhone = (raw: string) => bdPhone.safeParse(raw);

export const actions: Actions = {
	review: async ({ request, params }) => {
		const form = await request.formData();
		const text = (name: string) => String(form.get(name) ?? '').trim();

		const product = await productPage(params.slug);
		if (!product) error(404, 'Product not found');

		const phone = parsePhone(text('phone'));
		if (!phone.success) {
			return fail(400, { reviewError: 'Please enter the phone number you ordered with.' });
		}

		const result = await submitReview({
			productId: product.id,
			rating: Number(form.get('rating') ?? 0),
			title: text('title'),
			body: text('body'),
			authorName: text('name'),
			authorPhone: phone.data
		});

		if (!result.ok) {
			const message = {
				bad_rating: 'Please choose a rating from one to five stars.',
				too_short: 'Please write a little more — at least a sentence.',
				no_product: 'That product no longer exists.'
			}[result.reason];
			return fail(400, { reviewError: message });
		}

		// Said plainly: a review that vanishes into moderation without a word
		// reads as a broken form, and the customer writes it again.
		return { reviewed: true };
	},

	question: async ({ request, params }) => {
		const form = await request.formData();
		const text = (name: string) => String(form.get(name) ?? '').trim();

		const product = await productPage(params.slug);
		if (!product) error(404, 'Product not found');

		const phone = parsePhone(text('phone'));
		if (!phone.success) {
			return fail(400, { questionError: 'Please enter a phone number we can answer on.' });
		}

		const result = await askQuestion({
			productId: product.id,
			body: text('body'),
			askedName: text('name'),
			askedPhone: phone.data
		});

		if (!result.ok) {
			return fail(400, {
				questionError:
					result.reason === 'too_short'
						? 'Please write your question out in full.'
						: 'That product no longer exists.'
			});
		}

		return { asked: true };
	}
};
