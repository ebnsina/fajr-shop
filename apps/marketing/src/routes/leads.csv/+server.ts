import { error } from '@sveltejs/kit';
import { desc } from 'drizzle-orm';
import { env } from '$env/dynamic/private';
import { db } from '$lib/server/db';
import { lead } from '$lib/server/schema';

import type { RequestHandler } from './$types';

const COLUMNS = [
	'kind', 'demo', 'name', 'phone', 'shop', 'ordersBand',
	'selling', 'message', 'touches', 'firstSeenAt', 'lastSeenAt'
] as const;

// Quote everything: a shop name with a comma would otherwise shift every following column, and
// these are typed by hand.
const cell = (value: unknown) => {
	const text = value instanceof Date ? value.toISOString() : String(value ?? '');
	return `"${text.replaceAll('"', '""')}"`;
};

export const GET: RequestHandler = async ({ url }) => {
	const token = env.LEADS_EXPORT_TOKEN;
	if (!token) throw new Error('LEADS_EXPORT_TOKEN is not set — the export is disabled');
	if (url.searchParams.get('token') !== token) error(404, 'Not found');

	const rows = await db().select().from(lead).orderBy(desc(lead.lastSeenAt));

	const csv = [
		COLUMNS.join(','),
		...rows.map((row) => COLUMNS.map((c) => cell(row[c])).join(','))
	].join('\n');

	return new Response(csv, {
		headers: {
			'content-type': 'text/csv; charset=utf-8',
			'content-disposition': 'attachment; filename="fajr-leads.csv"',
			// Never cached: it holds personal data and changes constantly.
			'cache-control': 'no-store'
		}
	});
};
