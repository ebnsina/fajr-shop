import { fail } from '@sveltejs/kit';
import { cart as t, errorText } from '#lib/copy.js';
import { saveCartToken } from '#lib/server/session.js';
import type { Actions } from './$types';

type Api = App.Locals['api'];

async function setQuantity(
	api: Api,
	cookies: Parameters<Actions[string]>[0]['cookies'],
	variant: string,
	quantity: number
) {
	const { data, error } = await api.PUT('/v1/cart/items/{variant_id}', {
		params: { path: { variant_id: variant } },
		body: { quantity }
	});
	if (!data) {
		// "Only 3 left." comes from the API's field message, already in plain words.
		return fail(400, {
			variant,
			message: error?.error.fields?.quantity ?? errorText(error?.error.code)
		});
	}
	if (data.token) saveCartToken(cookies, data.token);
	return { variant, cart: data };
}

const read = (form: FormData) => ({
	variant: String(form.get('variant') ?? ''),
	quantity: Math.max(0, Math.min(99, Math.trunc(Number(form.get('quantity')) || 0)))
});

export const actions: Actions = {
	// Adds to what's already in the bag, so pressing "Add to bag" twice means two.
	add: async ({ request, locals, cookies }) => {
		const { variant, quantity } = read(await request.formData());
		const { data } = await locals.api.GET('/v1/cart');
		const already = data?.items.find((i) => i.variant_id === variant)?.quantity ?? 0;
		const result = await setQuantity(
			locals.api,
			cookies,
			variant,
			Math.min(99, already + Math.max(1, quantity))
		);
		if ('cart' in result) {
			const name = result.cart.items.find((i) => i.variant_id === variant)?.name ?? '';
			return { ...result, added: t.added(name) };
		}
		return result;
	},
	set: async ({ request, locals, cookies }) => {
		const { variant, quantity } = read(await request.formData());
		return setQuantity(locals.api, cookies, variant, quantity);
	}
};
