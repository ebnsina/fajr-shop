import { fail } from '@sveltejs/kit';
import { errorText } from '#lib/copy.js';
import type { Actions } from './$types';

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const email = String((await request.formData()).get('email') ?? '').trim();
		const { error } = await locals.api.POST('/v1/newsletter', { body: { email } });
		if (error) return fail(400, { message: errorText(error.error.code) });
		return { subscribed: true };
	}
};
