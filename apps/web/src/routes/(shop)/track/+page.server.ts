import { fail } from '@sveltejs/kit';
import { trackForm } from '@fajr/schemas';
import { trackOrder } from '@fajr/core/orders';
import { consume } from '@fajr/core/auth';
import { clientIp } from '$lib/server/session';
import type { Actions } from './$types';

export const actions: Actions = {
	default: async ({ request, getClientAddress }) => {
		const raw = Object.fromEntries(await request.formData());
		const parsed = trackForm.safeParse(raw);
		if (!parsed.success) {
			return fail(400, { error: 'Enter your order code and the phone number you ordered with.' });
		}

		// Public endpoint guessing at order codes — rate limit it per IP.
		const ip = clientIp(request, getClientAddress());
		if (ip) {
			const limit = await consume(`track:ip:${ip}`, 20, 10 * 60_000);
			if (!limit.allowed) return fail(429, { error: 'Too many tries. Wait a few minutes.' });
		}

		const found = await trackOrder(parsed.data.code, parsed.data.phone);
		if (!found) return fail(404, { error: "We couldn't find that order. Check the code and number." });

		return { order: found, phone: parsed.data.phone };
	}
};
