import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { cartFromToken, view, reserve } from '@fajr/core/cart';
import { place, trackOrder, quote } from '@fajr/core/orders';
import { assess, stampOrder } from '@fajr/core/risk';
import { isBlacklisted } from '@fajr/core/crm';
import { evaluate as evaluateCoupon } from '@fajr/core/marketing';
import { getSettings } from '@fajr/core/settings';
import { checkoutFormFor, phoneFor, divisionOf, countryOf } from '@fajr/schemas';
import type { Env } from '../app.ts';

const json = (schema: z.ZodTypeAny, description: string) => ({
	description,
	content: { 'application/json': { schema } }
});

export const checkoutRoutes = new OpenAPIHono<Env>();

checkoutRoutes.openapi(
	createRoute({
		method: 'post',
		path: '/api/v1/checkout',
		summary: 'Place an order from a cart',
		tags: ['checkout'],
		request: {
			body: {
				content: {
					'application/json': {
						schema: z.object({
							cartToken: z.string(),
							name: z.string(),
							phone: z.string(),
							district: z.string(),
							thana: z.string().optional(),
							area: z.string().optional(),
							detail: z.string(),
							note: z.string().optional(),
							paymentMethod: z.enum(['cod', 'bkash_manual']).default('cod'),
							couponCode: z.string().optional()
						})
					}
				}
			}
		},
		responses: {
			201: json(
				z.object({
					publicCode: z.string(),
					totalMinor: z.number(),
					advanceMinor: z.number(),
					currency: z.string()
				}),
				'Order placed'
			),
			400: json(
				z.object({ error: z.string(), message: z.string(), fields: z.record(z.string()).optional() }),
				'Invalid details'
			),
			403: json(z.object({ error: z.string(), message: z.string() }), 'Cash on delivery refused'),
			409: json(
				z.object({ error: z.string(), message: z.string(), failed: z.array(z.object({ title: z.string(), available: z.number() })).optional() }),
				'Cart changed underneath'
			)
		}
	}),
	async (c) => {
		const body = c.req.valid('json');
		const settings = await getSettings();

		// Validated against this shop's own country, so a Gulf number is accepted
		// by a Gulf shop and refused by a Bangladeshi one.
		const parsed = checkoutFormFor(settings.country).safeParse(body);
		if (!parsed.success) {
			const fields: Record<string, string> = {};
			for (const issue of parsed.error.issues) {
				const key = issue.path.join('.') || 'form';
				fields[key] ??= issue.message;
			}
			return c.json(
				{ error: 'invalid_details', message: 'Some details need fixing.', fields },
				400
			);
		}

		const cartId = await cartFromToken(body.cartToken);
		if (!cartId) {
			return c.json({ error: 'cart_not_found', message: 'That cart has expired.' }, 400);
		}

		const cart = await view(cartId);
		if (cart.lines.length === 0) {
			return c.json({ error: 'empty_cart', message: 'Your bag is empty.' }, 400);
		}

		const d = parsed.data;

		// A blocked number is a staff decision and outranks any score.
		if (await isBlacklisted(d.phone)) {
			return c.json(
				{
					error: 'cod_unavailable',
					message: `Cash on delivery is not available for this number. Please pay with ${countryOf(settings.country).manualPayLabel} to place the order.`
				},
				403
			);
		}

		await reserve(cartId);
		const shipping = await quote(d.district, cart.subtotalMinor);

		let discountMinor = 0;
		if (d.couponCode) {
			const coupon = await evaluateCoupon(d.couponCode, {
				subtotalMinor: cart.subtotalMinor,
				shippingMinor: shipping.shippingMinor,
				phoneE164: d.phone
			});
			// A bad code is not a reason to lose the order; it is dropped and
			// reported, and the client can show it against the field.
			if (coupon.ok) discountMinor = coupon.quote.discountMinor;
		}

		const risk = await assess(d.phone);

		const result = await place({
			cartId,
			name: d.name,
			phoneE164: d.phone,
			address: {
				division: divisionOf(d.district),
				district: d.district,
				thana: d.thana || null,
				area: d.area || null,
				detail: d.detail
			},
			paymentMethod: d.paymentMethod,
			note: d.note || null,
			couponCode: d.couponCode || null,
			attribution: { source: 'api' }
		});

		if (!result.ok) {
			const message = {
				empty_cart: 'Your bag is empty.',
				stock_changed: 'Something in your bag just sold out.',
				coupon_rejected: result.couponError ?? 'That code cannot be used.'
			}[result.reason];

			return c.json(
				{ error: result.reason, message, ...(result.failed ? { failed: result.failed } : {}) },
				409
			);
		}

		await stampOrder(result.orderId, risk);

		return c.json(
			{
				publicCode: result.publicCode,
				totalMinor: result.totalMinor,
				advanceMinor: result.advanceMinor,
				currency: settings.currency
			},
			201
		);
	}
);

checkoutRoutes.openapi(
	createRoute({
		method: 'get',
		path: '/api/v1/orders/{code}',
		summary: 'Track an order',
		tags: ['checkout'],
		request: {
			params: z.object({ code: z.string() }),
			// The code alone is not enough: order codes are short and guessable.
			query: z.object({ phone: z.string() })
		},
		responses: {
			200: json(z.object({}).passthrough(), 'The order'),
			404: json(z.object({ error: z.string(), message: z.string() }), 'Not found')
		}
	}),
	async (c) => {
		const settings = await getSettings();
		const phone = phoneFor(settings.country).safeParse(c.req.valid('query').phone);
		const missing = { error: 'order_not_found', message: 'We could not find that order.' };

		if (!phone.success) return c.json(missing, 404);

		const order = await trackOrder(c.req.valid('param').code, phone.data);
		if (!order) return c.json(missing, 404);

		return c.json({ order });
	}
);
