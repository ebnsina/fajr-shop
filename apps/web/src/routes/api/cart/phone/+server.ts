import { json } from '@sveltejs/kit';
import { bdPhone } from '@fajr/schemas';
import { attachPhone } from '@fajr/core/marketing';
import { currentCart } from '$lib/server/cart';
import type { RequestHandler } from './$types';

// Captures the phone as it is typed at checkout, before the form is submitted.
export const POST: RequestHandler = async ({ request, cookies }) => {
	const cartId = await currentCart(cookies);
	if (!cartId) return json({ ok: false }, { status: 204 });

	const body = (await request.json().catch(() => null)) as { phone?: string } | null;
	const parsed = bdPhone.safeParse(body?.phone ?? '');
	if (!parsed.success) return json({ ok: false });

	await attachPhone(cartId, parsed.data);
	return json({ ok: true });
};
