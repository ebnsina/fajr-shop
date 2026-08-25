import type { RequestHandler } from './$types';

// Everything private or per-visitor is disallowed. Crawlers indexing a cart or an order page is
// wasted budget at best; at worst it puts an order code into a search result.
const DISALLOW = ['/admin', '/cart', '/checkout', '/order', '/track', '/api'];

export const GET: RequestHandler = ({ url, setHeaders }) => {
	setHeaders({ 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'public, max-age=86400' });

	return new Response(
		[
			'User-agent: *',
			...DISALLOW.map((path) => `Disallow: ${path}`),
			'',
			`Sitemap: ${url.origin}/sitemap.xml`,
			''
		].join('\n')
	);
};
