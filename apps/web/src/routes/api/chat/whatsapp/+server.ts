import { json, text } from '@sveltejs/kit';
import { verifyWebhook, channelFor, ingest } from '@fajr/core/chat';

import type { RequestHandler } from './$types';

const SLUG = 'whatsapp';

// Meta's subscribe handshake. Echoing the challenge without checking the token
// would let anyone point their webhook at this shop.
export const GET: RequestHandler = async ({ url }) => {
	const ok = await verifyWebhook(
		SLUG,
		url.searchParams.get('hub.mode'),
		url.searchParams.get('hub.verify_token')
	);
	if (!ok) return text('Forbidden', { status: 403 });
	return text(url.searchParams.get('hub.challenge') ?? '');
};

export const POST: RequestHandler = async ({ request }) => {
	const channel = await channelFor(SLUG);
	// 200 regardless: Meta retries a non-200 for hours, and a shop that has not
	// connected the channel has nothing to retry into.
	if (!channel) return json({ ok: true, ignored: 'not connected' });

	let payload: unknown;
	try {
		payload = await request.json();
	} catch {
		return json({ ok: true, ignored: 'unparseable' });
	}

	const messages = channel.parse(payload);
	for (const message of messages) await ingest(message);

	return json({ ok: true, received: messages.length });
};
