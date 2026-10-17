import { error } from '@sveltejs/kit';
import { errorText } from '#lib/copy.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const list = (query: { featured?: boolean; on_sale?: boolean }) =>
		locals.api.GET('/v1/products', { params: { query: { ...query, sort: 'newest', limit: 10 } } });
	const [banners, featured, onSale, newest] = await Promise.all([
		locals.api.GET('/v1/banners'),
		list({ featured: true }),
		list({ on_sale: true }),
		list({})
	]);
	for (const r of [banners, featured, onSale, newest]) {
		if (!r.data) error(r.response.status, errorText(r.error?.error.code));
	}
	const b = banners.data!.items;
	return {
		hero: b.filter((x) => x.placement === 'hero'),
		side: b.filter((x) => x.placement === 'side').slice(0, 2),
		wide: b.filter((x) => x.placement === 'wide'),
		featured: featured.data!.items,
		onSale: onSale.data!.items,
		newest: newest.data!.items
	};
};
