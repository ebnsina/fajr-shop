import { navCategories } from '@fajr/core/catalog';
import { menuFor } from '@fajr/core/cms';
import { db, setting, eq } from '@fajr/db';
import { view } from '@fajr/core/cart';
import { currentCart } from '$lib/server/cart';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ cookies }) => {
	const [store, categories, menu] = await Promise.all([
		db.read.query.setting.findFirst({ where: eq(setting.id, 'default') }),
		navCategories(),
		menuFor('main')
	]);

	// A curated menu wins when one exists; otherwise the top-level categories are a sensible.
	const nav = menu.length
		? menu.map((m) => ({ id: m.id, label: m.label, href: m.href }))
		: categories.map((c) => ({ id: c.id, label: c.name, href: `/c/${c.slug}` }));

	const cartId = await currentCart(cookies);
	const cartCount = cartId ? (await view(cartId)).itemCount : 0;

	return {
		store: {
			name: store?.storeName ?? 'Fajr Shop',
			currency: store?.currency ?? 'BDT',
			theme: store?.theme ?? 'fashion',
			country: store?.country ?? 'BD',
			locale: store?.defaultLocale ?? 'bn',
			supportPhone: store?.supportPhone ?? null
		},
		categories,
		nav,
		cartCount
	};
};
