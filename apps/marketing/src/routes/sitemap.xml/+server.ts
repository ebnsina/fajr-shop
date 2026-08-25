import { DEMOS, META, SITE_URL } from '$lib/content';

import type { RequestHandler } from './$types';

// Generated from META and DEMOS, so a new page cannot be forgotten here.
export const GET: RequestHandler = () => {
	const paths = [...Object.keys(META), ...DEMOS.map((d) => `/demo/${d.key}`)];
	const urls = paths
		.map((path) => `<url><loc>${new URL(path, SITE_URL).href}</loc></url>`)
		.join('');

	return new Response(
		`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`,
		{ headers: { 'content-type': 'application/xml', 'cache-control': 'public, max-age=3600' } }
	);
};
