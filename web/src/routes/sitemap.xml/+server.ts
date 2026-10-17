import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// Every product for sale and every category.
// ponytail: walks up to 50 pages of 100 (5,000 products); split into a sitemap index past that.
export const GET: RequestHandler = async ({ locals, url }) => {
	const cats = await locals.api.GET('/v1/categories');
	if (!cats.data) error(502, 'Could not build the sitemap');
	const paths = ['/', '/shop', ...cats.data.items.map((c) => `/c/${c.slug}`)];
	let cursor: string | undefined;
	for (let i = 0; i < 50; i++) {
		const { data } = await locals.api.GET('/v1/products', {
			params: { query: { limit: 100, cursor } }
		});
		if (!data) error(502, 'Could not build the sitemap');
		paths.push(...data.items.map((p) => `/p/${p.slug}`));
		if (!data.next_cursor) break;
		cursor = data.next_cursor;
	}
	const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
	const body =
		'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
		paths.map((p) => `<url><loc>${esc(url.origin + p)}</loc></url>`).join('\n') +
		'\n</urlset>\n';
	return new Response(body, {
		headers: { 'content-type': 'application/xml', 'cache-control': 'public, max-age=3600' }
	});
};
