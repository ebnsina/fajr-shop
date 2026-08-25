import { feedItems } from '@fajr/core/seo';
import { db, setting, eq } from '@fajr/db';
import type { RequestHandler } from './$types';

const escape = (s: string) =>
	s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const money = (minor: number, currency: string) => `${(minor / 100).toFixed(2)} ${currency}`;

// RSS 2.0 with the Google namespace: one feed serves both Facebook catalogue
// and Google Merchant Center, which is what dynamic retargeting needs.
export const GET: RequestHandler = async ({ url, setHeaders }) => {
	const store = await db.read.query.setting.findFirst({ where: eq(setting.id, 'default') });
	const currency = store?.currency ?? 'BDT';
	const items = await feedItems(url.origin, currency);

	setHeaders({
		'content-type': 'application/xml; charset=utf-8',
		'cache-control': 'public, max-age=1800, s-maxage=1800'
	});

	const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
<channel>
  <title>${escape(store?.storeName ?? 'Fajr Shop')}</title>
  <link>${escape(url.origin)}</link>
  <description>Product catalogue</description>
${items
	.map(
		(i) => `  <item>
    <g:id>${escape(i.id)}</g:id>
    <g:item_group_id>${escape(i.itemGroupId)}</g:item_group_id>
    <g:title>${escape(i.title)}</g:title>
    <g:description>${escape(i.description)}</g:description>
    <g:link>${escape(i.link)}</g:link>${i.imageLink ? `\n    <g:image_link>${escape(i.imageLink)}</g:image_link>` : ''}
    <g:availability>${i.availability}</g:availability>
    <g:condition>${i.condition}</g:condition>
    <g:price>${money(i.priceMinor, i.currency)}</g:price>${
		i.salePriceMinor !== null ? `\n    <g:sale_price>${money(i.salePriceMinor, i.currency)}</g:sale_price>` : ''
	}${i.brand ? `\n    <g:brand>${escape(i.brand)}</g:brand>` : ''}
  </item>`
	)
	.join('\n')}
</channel>
</rss>`;

	return new Response(body);
};
