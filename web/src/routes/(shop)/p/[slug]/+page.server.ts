import { error, fail } from '@sveltejs/kit';
import { errorText } from '#lib/copy.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params, url }) => {
	const path = { path: { slug: params.slug } };
	// ?reviews= is the next page of reviews, so "More reviews" works without scripts.
	const cursor = url.searchParams.get('reviews') ?? undefined;
	const [product, zones, reviews, questions] = await Promise.all([
		locals.api.GET('/v1/products/{slug}', { params: path }),
		locals.api.GET('/v1/shipping/zones'),
		locals.api.GET('/v1/products/{slug}/reviews', { params: { ...path, query: { cursor } } }),
		locals.api.GET('/v1/products/{slug}/questions', { params: path })
	]);
	if (!product.data) error(product.response.status, errorText(product.error?.error.code));
	// Others from the same category; the page still works if this list can't be had.
	const cat = product.data.category?.slug;
	const similar = cat
		? await locals.api.GET('/v1/products', { params: { query: { category: cat, limit: 6 } } })
		: null;
	return {
		product: product.data,
		zones: zones.data?.items ?? [],
		similar: (similar?.data?.items ?? []).filter((x) => x.id !== product.data.id).slice(0, 5),
		reviews: reviews.data ?? null,
		questions: questions.data?.items ?? null
	};
};

type Failure = { error: { code: string; fields?: Record<string, string> } };
const failure = (action: string, err?: Failure) =>
	fail(400, { action, fields: err?.error.fields ?? {}, message: errorText(err?.error.code) });

export const actions: Actions = {
	review: async ({ request, locals, params }) => {
		const form = await request.formData();
		const rating = Number(form.get('rating'));
		if (!(rating >= 1 && rating <= 5))
			return fail(400, {
				action: 'review',
				fields: { rating: 'Pick from 1 to 5 stars.' },
				message: ''
			});
		const { error: err } = await locals.api.PUT('/v1/products/{slug}/reviews/mine', {
			params: { path: { slug: params.slug } },
			body: { rating, body: String(form.get('body') ?? '').trim() }
		});
		if (err) return failure('review', err);
		return { action: 'review', saved: true };
	},
	unreview: async ({ locals, params }) => {
		const { error: err } = await locals.api.DELETE('/v1/products/{slug}/reviews/mine', {
			params: { path: { slug: params.slug } }
		});
		if (err) return failure('unreview', err);
		return { action: 'unreview', saved: true };
	},
	ask: async ({ request, locals, params }) => {
		const body = String((await request.formData()).get('body') ?? '').trim();
		if (!body)
			return fail(400, { action: 'ask', fields: { body: 'Write your question.' }, message: '' });
		const { error: err } = await locals.api.POST('/v1/products/{slug}/questions', {
			params: { path: { slug: params.slug } },
			body: { body }
		});
		if (err) return failure('ask', err);
		return { action: 'ask', saved: true };
	}
};
