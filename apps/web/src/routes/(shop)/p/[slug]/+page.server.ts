import { error } from '@sveltejs/kit';
import { livePage } from '@fajr/core/cms';
import { resolveBlocks } from '$lib/server/renderBlocks';
import type { PageServerLoad } from './$types';
import { titled } from '$lib/meta';

export const load: PageServerLoad = async ({ params, url, parent }) => {
	const { store } = await parent();
	// A draft resolves only with its preview token, so a page can be shared for
	// approval without being live.
	const preview = url.searchParams.get('preview');
	const page = await livePage(params.slug, preview);
	if (!page) error(404, 'Page not found');

	return {
		page,
		blocks: await resolveBlocks(page),
		isPreview: Boolean(preview),
		meta: {
			title: titled(store.name, page.metaTitle ?? page.title),
			description: page.metaDescription ?? undefined,
			// A draft shared for approval must never reach an index.
			noindex: Boolean(preview)
		}
	};
};
