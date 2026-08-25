import { error, fail } from '@sveltejs/kit';
import { thread, reply, markRead, setStatus, suggest } from '@fajr/core/chat';
import { getSettings } from '@fajr/core/settings';
import { countryOf } from '@fajr/schemas';
import { guardActions, requirePermission } from '$lib/server/guard';

import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	requirePermission(locals, 'order.read');

	const conversation = await thread(params.id);
	if (!conversation) error(404, 'That conversation no longer exists.');

	// Opening the thread is reading it.
	await markRead(params.id);

	const settings = await getSettings();
	const lastInbound = [...conversation.messages].reverse().find((m) => m.direction === 'in');

	const suggestions = lastInbound
		? await suggest({
				text: lastInbound.body,
				phoneE164: conversation.phoneE164,
				storeName: settings.storeName,
				deliversTo: countryOf(settings.country).deliversTo
			})
		: [];

	return { conversation, suggestions };
};

export const actions: Actions = guardActions('order.write', {
	send: async ({ request, params, locals }) => {
		const form = await request.formData();
		const body = String(form.get('body') ?? '').trim();
		if (!body) return fail(400, { error: 'Write something first.' });

		const result = await reply(params.id, body, {
			actorId: locals.staff?.id,
			wasSuggested: form.get('suggested') === 'true'
		});

		return result.ok ? { sent: true } : fail(502, { error: result.error });
	},

	status: async ({ request, params, locals }) => {
		const form = await request.formData();
		const next = String(form.get('status') ?? 'open') as 'open' | 'snoozed' | 'closed';
		await setStatus(params.id, next, { actorId: locals.staff?.id });
		return { moved: next };
	}
});
