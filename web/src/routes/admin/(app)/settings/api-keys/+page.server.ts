import { error, fail } from '@sveltejs/kit';
import { apiKeys as t, errorText } from '#lib/copy.js';
import type { components } from '#lib/api.js';
import type { Actions, PageServerLoad } from './$types';

type Scope = components['schemas']['ApiKeyScope'];

export const load: PageServerLoad = async ({ locals }) => {
	const { data, error: err, response } = await locals.api.GET('/v1/admin/api-keys');
	if (!data) error(response.status, errorText(err?.error.code));
	return { keys: data.items };
};

export const actions: Actions = {
	create: async ({ request, locals }) => {
		const form = await request.formData();
		const name = String(form.get('name') ?? '').trim();
		const scopes = form.getAll('scopes').map(String) as Scope[];
		if (!name || !scopes.length) {
			return fail(400, {
				fields: {
					...(!name && { name: t.nameHint }),
					...(!scopes.length && { scopes: t.scopesError })
				},
				message: undefined
			});
		}
		const { data, error: err } = await locals.api.POST('/v1/admin/api-keys', {
			body: { name, scopes }
		});
		if (!data)
			return fail(400, {
				fields: err?.error.fields ?? {},
				message: errorText(err?.error.code)
			});
		return { created: data };
	},
	revoke: async ({ request, locals }) => {
		const id = String((await request.formData()).get('id'));
		const { error: err, response } = await locals.api.DELETE('/v1/admin/api-keys/{id}', {
			params: { path: { id } }
		});
		if (err)
			return fail(response.status, {
				fields: {},
				message: errorText(err.error.code)
			});
	}
};
