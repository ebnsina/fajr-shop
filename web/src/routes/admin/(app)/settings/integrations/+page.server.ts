import { error, fail } from '@sveltejs/kit';
import { errorText } from '#lib/copy.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const { data, error: err, response } = await locals.api.GET('/v1/admin/providers');
	if (!data) error(response.status, errorText(err?.error.code));
	return { providers: data.items };
};

async function put(locals: App.Locals, code: string, enabled: boolean, live: boolean, values = {}) {
	const { data, error: err } = await locals.api.PUT('/v1/admin/providers/{code}', {
		params: { path: { code } },
		body: { enabled, live, values }
	});
	if (!data)
		return fail(400, { fields: err?.error.fields ?? {}, message: errorText(err?.error.code) });
	return { saved: data.name };
}

export const actions: Actions = {
	// Key fields arrive as "v.<key>"; an empty secret keeps the saved one on the API's side.
	save: async ({ request, locals }) => {
		const form = await request.formData();
		const values = Object.fromEntries(
			[...form.entries()]
				.filter(([k]) => k.startsWith('v.'))
				.map(([k, v]) => [k.slice(2), String(v)])
		);
		return put(
			locals,
			String(form.get('code')),
			form.get('enabled') === 'on',
			form.get('live') === 'live',
			values
		);
	},
	toggle: async ({ request, locals }) => {
		const form = await request.formData();
		return put(
			locals,
			String(form.get('code')),
			form.get('enabled') === '1',
			form.get('live') === '1'
		);
	}
};
