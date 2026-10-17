import { error } from '@sveltejs/kit';
import type { components } from '#lib/api.js';
import { errorText } from '#lib/copy.js';
import { readCartToken, readSession } from '#lib/server/session.js';
import type { LayoutServerLoad } from './$types';

const noCart: components['schemas']['Cart'] = {
	items: [],
	item_count: 0,
	subtotal: 0,
	currency: 'BDT'
};

export const load: LayoutServerLoad = async ({ locals, cookies, setHeaders }) => {
	// Only someone with a cart (or signed in) costs a cart lookup, and only their pages turn private.
	const s = readSession(cookies);
	const personal = !!(readCartToken(cookies) || s.access || s.refresh);
	const [cats, cart] = await Promise.all([
		locals.api.GET('/v1/categories'),
		personal ? locals.api.GET('/v1/cart') : null
	]);
	if (!cats.data) error(cats.response.status, errorText(cats.error?.error.code));
	setHeaders({
		'cache-control': personal
			? 'private, no-store'
			: 'public, max-age=60, stale-while-revalidate=300'
	});
	return { categories: cats.data.items, cart: cart?.data ?? noCart };
};
