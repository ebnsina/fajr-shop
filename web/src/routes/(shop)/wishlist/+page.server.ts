import { error, fail, redirect } from '@sveltejs/kit';
import { errorText } from '#lib/copy.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, parent }) => {
	const { me } = await parent();
	if (!me) redirect(303, '/account/login?next=/wishlist');
	const { data, error: err, response } = await locals.api.GET('/v1/wishlist');
	if (!data) error(response.status, errorText(err?.error.code));
	return { items: data.items };
};

export const actions: Actions = {
	// Saves or unsaves one product; the hearts on every page post here.
	toggle: async ({ request, locals }) => {
		// "<product id>:1" saves, ":0" unsaves: one field, as a button's own name and value.
		const [product, save] = String((await request.formData()).get('toggle') ?? '').split(':');
		const params = { path: { product_id: product } };
		const { error: err } =
			save === '1'
				? await locals.api.PUT('/v1/wishlist/{product_id}', { params })
				: await locals.api.DELETE('/v1/wishlist/{product_id}', { params });
		if (err) return fail(400, { message: errorText(err.error.code) });
		return { ok: true };
	}
};
