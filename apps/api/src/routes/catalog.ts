import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { browse, productPage, categoryBySlug, related, facetsFor } from '@fajr/core/catalog';
import { publishedReviews, ratingSummary, ratingsFor, publishedQuestions } from '@fajr/core/social';
import type { Env } from '../app.ts';

const json = (schema: z.ZodTypeAny, description: string) => ({
	description,
	content: { 'application/json': { schema } }
});

const cardShape = z.object({
	id: z.string(),
	title: z.string(),
	slug: z.string(),
	summary: z.string().nullable(),
	priceMinor: z.number().nullable(),
	compareAtMinor: z.number().nullable(),
	imageUrl: z.string().nullable(),
	imageAlt: z.string().nullable(),
	inStock: z.boolean(),
	rating: z.object({ average: z.number(), count: z.number() }).nullable()
});

export const catalogRoutes = new OpenAPIHono<Env>();

// Ratings come back with the grid in one extra query, not one per card.
async function withRatings(items: Awaited<ReturnType<typeof browse>>['items']) {
	const ratings = await ratingsFor(items.map((i) => i.id));
	return items.map((item) => ({ ...item, rating: ratings.get(item.id) ?? null }));
}

catalogRoutes.openapi(
	createRoute({
		method: 'get',
		path: '/api/v1/products',
		summary: 'Browse and search products',
		tags: ['catalog'],
		request: {
			query: z.object({
				category: z.string().optional(),
				q: z.string().optional(),
				sort: z.enum(['newest', 'price-asc', 'price-desc']).optional(),
				inStock: z.enum(['true', 'false']).optional(),
				page: z.coerce.number().int().min(1).optional(),
				perPage: z.coerce.number().int().min(1).max(60).optional()
			})
		},
		responses: {
			200: json(
				z.object({
					items: z.array(cardShape),
					total: z.number(),
					page: z.number(),
					pages: z.number(),
					facets: z
						.array(
							z.object({
								name: z.string(),
								code: z.string(),
								unit: z.string().nullable(),
								values: z.array(z.object({ value: z.string(), count: z.number() }))
							})
						)
						.optional()
				}),
				'A page of products'
			),
			404: json(z.object({ error: z.string() }), 'No such category')
		}
	}),
	async (c) => {
		const query = c.req.valid('query');

		const category = query.category ? await categoryBySlug(query.category) : null;
		if (query.category && !category) return c.json({ error: 'category_not_found' }, 404);

		const result = await browse({
			categoryId: category?.id,
			search: query.q,
			sort: query.sort ?? 'newest',
			inStockOnly: query.inStock === 'true',
			page: query.page ?? 1,
			perPage: query.perPage
		});

		return c.json({
			...result,
			items: await withRatings(result.items),
			// Only a category has facets; a free-text search has nothing to filter on.
			...(category ? { facets: await facetsFor(category.id) } : {})
		});
	}
);

catalogRoutes.openapi(
	createRoute({
		method: 'get',
		path: '/api/v1/products/{slug}',
		summary: 'One product, with reviews, questions and related items',
		tags: ['catalog'],
		request: { params: z.object({ slug: z.string() }) },
		responses: {
			200: json(z.object({}).passthrough(), 'The product'),
			404: json(z.object({ error: z.string() }), 'No such product')
		}
	}),
	async (c) => {
		const product = await productPage(c.req.valid('param').slug);
		if (!product) return c.json({ error: 'product_not_found' }, 404);

		const [reviews, rating, questions, alsoLike] = await Promise.all([
			publishedReviews(product.id),
			ratingSummary(product.id),
			publishedQuestions(product.id),
			related(product.id, product.category?.id ?? null)
		]);

		return c.json({ product, reviews, rating, questions, alsoLike });
	}
);
