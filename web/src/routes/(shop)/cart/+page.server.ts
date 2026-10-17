import { fail, redirect } from '@sveltejs/kit';
import { cart as t, errorText } from '#lib/copy.js';
import { saveCartToken } from '#lib/server/session.js';
import type { Actions, PageServerLoad } from './$types';

type Api = App.Locals['api'];

// The delivery estimate is a GET form (?district=), so it works without scripts and can be shared.
export const load: PageServerLoad = async ({ locals, url }) => {
	const district = url.searchParams.get('district') ?? '';
	const [districts, quote] = await Promise.all([
		locals.api.GET('/v1/districts'),
		district ? locals.api.POST('/v1/cart/shipping-quote', { body: { district } }) : null
	]);
	return {
		districts: districts.data?.items ?? [],
		district,
		quote: quote?.data ?? null,
		quoteError: quote && !quote.data ? errorText(quote.error?.error.code) : null
	};
};

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

// Adds to what's already in the bag, so pressing "Add to bag" twice means two.
async function add(api: Api, cookies: Parameters<Actions[string]>[0]['cookies'], form: FormData) {
	const { variant, quantity } = read(form);
	const { data } = await api.GET('/v1/cart');
	const already = data?.items.find((i) => i.variant_id === variant)?.quantity ?? 0;
	return setQuantity(api, cookies, variant, Math.min(99, already + Math.max(1, quantity)));
}

export const actions: Actions = {
	add: async ({ request, locals, cookies }) => {
		const result = await add(locals.api, cookies, await request.formData());
		if ('cart' in result) {
			const name = result.cart.items.find((i) => i.variant_id === result.variant)?.name ?? '';
			return { ...result, added: t.added(name) };
		}
		return result;
	},
	buy: async ({ request, locals, cookies }) => {
		const result = await add(locals.api, cookies, await request.formData());
		if ('cart' in result) redirect(303, '/checkout');
		return result;
	},
	set: async ({ request, locals, cookies }) => {
		const { variant, quantity } = read(await request.formData());
		return setQuantity(locals.api, cookies, variant, quantity);
	},
	code: async ({ request, locals, cookies }) => {
		const code = String((await request.formData()).get('code') ?? '').trim();
		if (!code) return fail(400, { code, codeError: t.codePlaceholder });
		const { data, error } = await locals.api.PUT('/v1/cart/discount', { body: { code } });
		// "That code has ended." and the like come from the API in plain words.
		if (!data)
			return fail(400, {
				code,
				codeError: error?.error.fields?.code ?? errorText(error?.error.code)
			});
		if (data.token) saveCartToken(cookies, data.token);
		return { cart: data };
	},
	uncode: async ({ locals }) => {
		const { data, error } = await locals.api.DELETE('/v1/cart/discount');
		if (!data) return fail(400, { codeError: errorText(error?.error.code) });
		return { cart: data };
	}
};
