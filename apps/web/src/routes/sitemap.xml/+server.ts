import { sitemapEntries } from '@fajr/core/seo';
import type { RequestHandler } from './$types';

const escape = (s: string) =>
	s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export const GET: RequestHandler = async ({ url, setHeaders }) => {
	const entries = await sitemapEntries(url.origin);

	setHeaders({
		'content-type': 'application/xml; charset=utf-8',
		// Crawlers re-fetch this constantly; an hour at the edge is plenty.
		'cache-control': 'public, max-age=3600, s-maxage=3600'
	});

	const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries
	.map(
		(e) => `  <url>
    <loc>${escape(e.loc)}</loc>
    <lastmod>${e.lastmod}</lastmod>${e.changefreq ? `\n    <changefreq>${e.changefreq}</changefreq>` : ''}${
		e.priority !== undefined ? `\n    <priority>${e.priority}</priority>` : ''
	}
  </url>`
	)
	.join('\n')}
</urlset>`;

	return new Response(body);
};
