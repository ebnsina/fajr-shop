import { error, redirect } from '@sveltejs/kit';
import { productPage, findRedirect, specsFor } from '@fajr/core/catalog';
import type { PageServerLoad } from './$types';
import { titled } from '$lib/meta';

export const load: PageServerLoad = async ({ params, url, parent }) => {
	const { store } = await parent();
	const product = await productPage(params.slug);

	if (!product) {
		// Only on the miss path, so a renamed product costs one extra query
		// and a live one costs nothing.
		const moved = await findRedirect(url.pathname);
		if (moved) redirect(moved.status as 301, moved.to);
		error(404, 'Product not found');
	}

	// Empty for fashion products, which is exactly how the theme difference works:
	// the module is present, the data decides whether it renders.
	return {
		product,
		specs: await specsFor(product.id),
		meta: {
			title: titled(store.name, product.metaTitle ?? product.title),
			description: product.metaDescription ?? product.summary ?? undefined,
			type: 'product' as const,
			image: product.images[0]?.url ?? null
		}
	};
};
