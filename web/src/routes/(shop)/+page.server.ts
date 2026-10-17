import { error } from '@sveltejs/kit';
import { errorText } from '#lib/copy.js';
import type { PageServerLoad } from './$types';

type Query = { featured?: boolean; on_sale?: boolean; category?: string };

export const load: PageServerLoad = async ({ locals, parent }) => {
	const { categories } = await parent();
	// The first three departments get a row of their own.
	const departments = categories.filter((c) => !c.parent_id).slice(0, 3);
	const list = (query: Query, limit = 10) =>
		locals.api.GET('/v1/products', { params: { query: { ...query, sort: 'newest', limit } } });

	const [banners, brands, featured, onSale, newest, ...rows] = await Promise.all([
		locals.api.GET('/v1/banners'),
		locals.api.GET('/v1/brands'),
		list({ featured: true }),
		list({ on_sale: true }),
		list({}),
		...departments.map((d) => list({ category: d.slug }))
	]);
	for (const r of [banners, brands, featured, onSale, newest, ...rows]) {
		if (!r.data) error(r.response.status, errorText(r.error?.error.code));
	}
	const b = banners.data!.items;
	return {
		hero: b.filter((x) => x.placement === 'hero'),
		side: b.filter((x) => x.placement === 'side').slice(0, 2),
		wide: b.filter((x) => x.placement === 'wide'),
		brands: brands.data!.items.slice(0, 12),
		featured: featured.data!.items,
		onSale: onSale.data!.items,
		newest: newest.data!.items,
		departments: departments
			.map((d, i) => ({ category: d, products: rows[i].data!.items }))
			.filter((d) => d.products.length)
	};
};
