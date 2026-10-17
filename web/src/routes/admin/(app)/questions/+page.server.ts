import { error, fail } from '@sveltejs/kit';
import { errorText } from '#lib/copy.js';
import type { Actions, PageServerLoad } from './$types';

// Waiting questions by default; ?all=1 shows answered and hidden ones too.
export const load: PageServerLoad = async ({ locals, url }) => {
	const all = url.searchParams.get('all') === '1';
	const {
		data,
		error: err,
		response
	} = await locals.api.GET('/v1/admin/questions', {
		params: { query: { waiting: !all } }
	});
	if (!data) error(response.status, errorText(err?.error.code));
	return { questions: data.items, all };
};

export const actions: Actions = {
	save: async ({ request, locals }) => {
		const form = await request.formData();
		const answer = String(form.get('answer') ?? '').trim();
		const { error: err } = await locals.api.PUT('/v1/admin/questions/{id}', {
			params: { path: { id: String(form.get('id')) } },
			// The Hide/Show button sends `hidden`; Post answer keeps it as it was.
			body: { answer: answer || null, hidden: (form.get('hidden') ?? form.get('current')) === '1' }
		});
		if (err) return fail(400, { message: err.error.fields?.answer ?? errorText(err.error.code) });
		return { saved: true };
	}
};
