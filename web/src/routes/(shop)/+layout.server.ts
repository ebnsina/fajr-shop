import { error } from '@sveltejs/kit';
import type { components } from '#lib/api.js';
import { errorText } from '#lib/copy.js';
import { readCartToken, readSaved, readSession } from '#lib/server/session.js';
import type { LayoutServerLoad } from './$types';

const noCart: components['schemas']['Cart'] = {
	items: [],
	item_count: 0,
	subtotal: 0,
	discount_total: 0,
	total: 0,
	currency: 'BDT'
};

// Pages about one person's order are never cached, whoever is looking.
const private_ = /^\/(orders|checkout)(\/|$)/;

export const load: LayoutServerLoad = async ({ locals, cookies, setHeaders, url }) => {
	// Only someone with a cart or a session costs these lookups, and only their pages turn private.
	const s = readSession(cookies);
	const signedIn = !!(s.access || s.refresh);
	const guestSaved = signedIn ? [] : readSaved(cookies);
	const personal = signedIn || !!readCartToken(cookies) || guestSaved.length > 0;
	const [cats, cart, me, wishlist] = await Promise.all([
		locals.api.GET('/v1/categories'),
		personal ? locals.api.GET('/v1/cart') : null,
		signedIn ? locals.api.GET('/v1/me') : null,
		signedIn ? locals.api.GET('/v1/wishlist') : null
	]);
	if (!cats.data) error(cats.response.status, errorText(cats.error?.error.code));
	setHeaders({
		'cache-control':
			personal || private_.test(url.pathname)
				? 'private, no-store'
				: 'public, max-age=60, stale-while-revalidate=300'
	});
	return {
		categories: cats.data.items,
		cart: cart?.data ?? noCart,
		me: me?.data ?? null,
		// Ids of the products the customer saved, so every heart on the page shows its state.
		saved: wishlist?.data?.items.map((p) => p.id) ?? guestSaved
	};
};
