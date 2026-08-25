import { error, fail } from '@sveltejs/kit';
import { customerProfile, setBlacklisted, setNote } from '@fajr/core/crm';
import { assess } from '@fajr/core/risk';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const phone = decodeURIComponent(params.phone);
	const profile = await customerProfile(phone);
	if (!profile) error(404, 'Customer not found');

	// Cached for a week, so opening a profile is not a paid API call each time.
	const risk = await assess(phone).catch(() => null);

	return { profile, risk };
};

export const actions: Actions = {
	blacklist: async ({ request, params }) => {
		const form = await request.formData();
		const note = String(form.get('note') ?? '').trim();
		if (form.get('blocked') === 'true' && !note) {
			// A block with no reason is a mystery for whoever inherits it.
			return fail(400, { error: 'Give a reason before blocking someone.' });
		}
		await setBlacklisted(decodeURIComponent(params.phone), form.get('blocked') === 'true', note || null);
		return { done: true };
	},

	note: async ({ request, params }) => {
		const form = await request.formData();
		await setNote(decodeURIComponent(params.phone), String(form.get('note') ?? '').trim() || null);
		return { done: true };
	}
};
