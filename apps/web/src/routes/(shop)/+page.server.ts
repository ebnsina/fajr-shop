import { browse, navCategories } from '@fajr/core/catalog';
import { homePage } from '@fajr/core/cms';
import { resolveBlocks } from '$lib/server/renderBlocks';
import type { PageServerLoad } from './$types';

// The home page is a composed page when the merchant has built one, and a sensible default
// when.
export const load: PageServerLoad = async () => {
	const page = await homePage();
	if (page) {
		return { page, blocks: await resolveBlocks(page), fallback: null };
	}

	const [newest, categories] = await Promise.all([
		browse({ sort: 'newest', perPage: 8 }),
		navCategories()
	]);

	return { page: null, blocks: null, fallback: { newest: newest.items, categories } };
};
