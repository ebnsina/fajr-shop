import { error, fail } from '@sveltejs/kit';
import { errorText } from '#lib/copy.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const { data, error: err, response } = await locals.api.GET('/v1/admin/reviews');
	if (!data) error(response.status, errorText(err?.error.code));
	return { reviews: data.items };
};

export const actions: Actions = {
	moderate: async ({ request, locals }) => {
		const form = await request.formData();
		const hidden = form.get('hidden') === '1';
		const { error: err } = await locals.api.PATCH('/v1/admin/reviews/{id}', {
			params: { path: { id: String(form.get('id')) } },
			body: { hidden }
		});
		if (err) return fail(400, { message: errorText(err.error.code) });
		return { hidden };
	}
};
