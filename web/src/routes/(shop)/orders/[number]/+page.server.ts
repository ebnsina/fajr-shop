import { error } from '@sveltejs/kit';
import { errorText } from '#lib/copy.js';
import type { PageServerLoad } from './$types';

// Its customer sees it signed in; anyone else needs the link's ?token=.
export const load: PageServerLoad = async ({ locals, params, url, setHeaders }) => {
	const number = Number(params.number);
	if (!Number.isSafeInteger(number) || number < 1) error(404, errorText('not_found'));
	const token = url.searchParams.get('token') ?? undefined;
	const {
		data,
		error: err,
		response
	} = await locals.api.GET('/v1/orders/{number}', {
		params: { path: { number }, query: { token } }
	});
	if (!data) error(response.status, errorText(err?.error.code));
	// The link carries the order's key; don't hand it to other sites in the Referer header.
	setHeaders({ 'referrer-policy': 'no-referrer' });
	return { order: data, placed: url.searchParams.has('placed'), guestLink: !!token };
};
