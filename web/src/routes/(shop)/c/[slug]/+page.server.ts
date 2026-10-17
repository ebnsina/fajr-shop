import { error } from '@sveltejs/kit';
import { listing } from '#lib/server/listing.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url, params, parent }) => {
	const { categories } = await parent();
	const category = categories.find((c) => c.slug === params.slug);
	if (!category) error(404, 'Not found');
	const parentCategory = categories.find((c) => c.id === category.parent_id);
	const children = categories.filter((c) => c.parent_id === category.id);
	return {
		category,
		parentCategory,
		children,
		...(await listing(locals.api, url, { category: params.slug }))
	};
};
