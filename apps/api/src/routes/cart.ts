import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { createCart, cartFromToken, view, addItem, setQty, removeItem } from '@fajr/core/cart';
import { quote } from '@fajr/core/orders';
import type { Env } from '../app.ts';

const json = (schema: z.ZodTypeAny, description: string) => ({
	description,
	content: { 'application/json': { schema } }
});

const cartShape = z.object({}).passthrough();

export const cartRoutes = new OpenAPIHono<Env>();

// The cart token is the client's handle. A mobile app has no cookie jar, so it
// holds the token itself and sends it back on every call.
// Stable codes the client maps to its own wording, plus a plain-language
// fallback so an unhandled one is still readable to a person.
const ADD_ERRORS: Record<string, { status: 404 | 409; error: string; message: string }> = {
	not_found: { status: 404, error: 'variant_not_found', message: 'That option is no longer available.' },
	unavailable: { status: 409, error: 'out_of_stock', message: 'There is not enough of that left.' }
};

async function resolve(token: string | undefined) {
	const id = await cartFromToken(token);
	return id;
}

cartRoutes.openapi(
	createRoute({
		method: 'post',
		path: '/api/v1/cart',
		summary: 'Start a cart',
		tags: ['cart'],
		responses: { 201: json(z.object({ id: z.string(), token: z.string() }), 'A new cart') }
	}),
	async (c) => c.json(await createCart(), 201)
);

cartRoutes.openapi(
	createRoute({
		method: 'get',
		path: '/api/v1/cart/{token}',
		summary: 'Read a cart, with delivery quoted for an area',
		tags: ['cart'],
		request: {
			params: z.object({ token: z.string() }),
			query: z.object({ area: z.string().optional() })
		},
		responses: {
			200: json(cartShape, 'The cart and its delivery quote'),
			404: json(z.object({ error: z.string() }), 'No such cart')
		}
	}),
	async (c) => {
		const id = await resolve(c.req.valid('param').token);
		if (!id) return c.json({ error: 'cart_not_found' }, 404);

		const cart = await view(id);
		return c.json({ cart, shipping: await quote(c.req.valid('query').area ?? null, cart.subtotalMinor) });
	}
);

cartRoutes.openapi(
	createRoute({
		method: 'post',
		path: '/api/v1/cart/{token}/items',
		summary: 'Add a variant to the cart',
		tags: ['cart'],
		request: {
			params: z.object({ token: z.string() }),
			body: {
				content: {
					'application/json': {
						schema: z.object({ variantId: z.string(), qty: z.number().int().min(1).max(99).default(1) })
					}
				}
			}
		},
		responses: {
			200: json(cartShape, 'The updated cart'),
			404: json(z.object({ error: z.string(), message: z.string() }), 'Cart or variant missing'),
			409: json(z.object({ error: z.string(), message: z.string() }), 'Not available')
		}
	}),
	async (c) => {
		const id = await resolve(c.req.valid('param').token);
		if (!id) return c.json({ error: 'cart_not_found', message: 'That cart has expired.' }, 404);

		const { variantId, qty } = c.req.valid('json');
		const result = await addItem(id, variantId, qty);

		if (!result.ok) {
			const mapped = ADD_ERRORS[result.reason] ?? {
				status: 409 as const,
				error: result.reason,
				message: 'That could not be added.'
			};
			return c.json({ error: mapped.error, message: mapped.message }, mapped.status);
		}

		return c.json({ cart: await view(id) });
	}
);

cartRoutes.openapi(
	createRoute({
		method: 'patch',
		path: '/api/v1/cart/{token}/items/{itemId}',
		summary: 'Change a line quantity',
		tags: ['cart'],
		request: {
			params: z.object({ token: z.string(), itemId: z.string() }),
			body: {
				content: { 'application/json': { schema: z.object({ qty: z.number().int().min(0).max(99) }) } }
			}
		},
		responses: {
			200: json(cartShape, 'The updated cart'),
			404: json(z.object({ error: z.string(), message: z.string() }), 'Cart missing'),
			409: json(z.object({ error: z.string(), message: z.string() }), 'Not enough stock')
		}
	}),
	async (c) => {
		const { token, itemId } = c.req.valid('param');
		const id = await resolve(token);
		if (!id) return c.json({ error: 'cart_not_found', message: 'That cart has expired.' }, 404);

		const result = await setQty(id, itemId, c.req.valid('json').qty);
		if (!result.ok) {
			const mapped = ADD_ERRORS[result.reason] ?? {
				status: 409 as const,
				error: result.reason,
				message: 'That quantity is not available.'
			};
			return c.json({ error: mapped.error, message: mapped.message }, mapped.status);
		}

		return c.json({ cart: await view(id) });
	}
);

cartRoutes.openapi(
	createRoute({
		method: 'delete',
		path: '/api/v1/cart/{token}/items/{itemId}',
		summary: 'Remove a line',
		tags: ['cart'],
		request: { params: z.object({ token: z.string(), itemId: z.string() }) },
		responses: {
			200: json(cartShape, 'The updated cart'),
			404: json(z.object({ error: z.string() }), 'No such cart')
		}
	}),
	async (c) => {
		const { token, itemId } = c.req.valid('param');
		const id = await resolve(token);
		if (!id) return c.json({ error: 'cart_not_found' }, 404);

		await removeItem(id, itemId);
		return c.json({ cart: await view(id) });
	}
);
