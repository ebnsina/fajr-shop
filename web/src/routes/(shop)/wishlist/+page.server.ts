import { error, fail } from '@sveltejs/kit';
import { errorText } from '#lib/copy.js';
import { readSaved, readSession, saveSaved } from '#lib/server/session.js';
import type { Actions, PageServerLoad } from './$types';

// A customer's saved items come from their account; a guest's from a cookie until they sign in.
export const load: PageServerLoad = async ({ locals, parent, cookies }) => {
	const { me } = await parent();
	if (me) {
		const { data, error: err, response } = await locals.api.GET('/v1/wishlist');
		if (!data) error(response.status, errorText(err?.error.code));
		return { items: data.items, guest: false };
	}
	const ids = readSaved(cookies);
	if (!ids.length) return { items: [], guest: true };
	const {
		data,
		error: err,
		response
	} = await locals.api.GET('/v1/products', {
		params: { query: { ids, limit: 100 } }
	});
	if (!data) error(response.status, errorText(err?.error.code));
	return { items: data.items, guest: true };
};

export const actions: Actions = {
	// Saves or unsaves one product; the hearts on every page post here.
	toggle: async ({ request, locals, cookies }) => {
		// "<product id>:1" saves, ":0" unsaves: one field, as a button's own name and value.
		const [product, save] = String((await request.formData()).get('toggle') ?? '').split(':');
		const s = readSession(cookies);
		if (!s.access && !s.refresh) {
			const ids = readSaved(cookies).filter((id) => id !== product);
			saveSaved(cookies, save === '1' ? [product, ...ids] : ids);
			return { ok: true };
		}
		const params = { path: { product_id: product } };
		const { error: err } =
			save === '1'
				? await locals.api.PUT('/v1/wishlist/{product_id}', { params })
				: await locals.api.DELETE('/v1/wishlist/{product_id}', { params });
		if (err) return fail(400, { message: errorText(err.error.code) });
		return { ok: true };
	}
};
