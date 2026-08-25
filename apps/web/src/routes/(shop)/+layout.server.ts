import { navCategories } from '@fajr/core/catalog';
import { menuFor } from '@fajr/core/cms';
import { db, setting, media, eq } from '@fajr/db';
import { view } from '@fajr/core/cart';
import { currentCart } from '$lib/server/cart';
import { publicUrl } from '@fajr/core/media';
import type { LayoutServerLoad } from './$types';

// The logo doubles as the share-card image, so a link to the shop is never blank.
async function logoUrl(mediaId: string) {
	const row = await db.read.query.media.findFirst({
		columns: { key: true },
		where: eq(media.id, mediaId)
	});
	return row ? publicUrl(row.key) : null;
}

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
			supportPhone: store?.supportPhone ?? null,
			supportHours: store?.supportHours ?? null,
			tagline: store?.tagline ?? null,
			announcement: store?.announcement ?? null,
			logoUrl: store?.logoMediaId ? await logoUrl(store.logoMediaId) : null
		},
		categories,
		nav,
		cartCount
	};
};
