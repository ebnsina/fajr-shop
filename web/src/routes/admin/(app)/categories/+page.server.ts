import { error, fail } from '@sveltejs/kit';
import { errorText } from '#lib/copy.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const { data, error: err, response } = await locals.api.GET('/v1/categories');
	if (!data) error(response.status, errorText(err?.error.code));
	return { categories: data.items };
};

function input(form: FormData) {
	return {
		name: String(form.get('name') ?? '').trim(),
		parent_id: String(form.get('parent_id') ?? '') || null,
		position: Number(form.get('position') ?? 0) || 0
	};
}

export const actions: Actions = {
	create: async ({ request, locals }) => {
		const body = input(await request.formData());
		const { data, error: err } = await locals.api.POST('/v1/admin/categories', { body });
		if (!data)
			return fail(400, {
				action: 'create',
				fields: err?.error.fields ?? {},
				message: errorText(err?.error.code)
			});
		return { action: 'create', saved: true };
	},
	update: async ({ request, locals }) => {
		const form = await request.formData();
		const { data, error: err } = await locals.api.PUT('/v1/admin/categories/{id}', {
			params: { path: { id: String(form.get('id')) } },
			body: input(form)
		});
		if (!data)
			return fail(400, {
				action: 'update',
				fields: err?.error.fields ?? {},
				message: errorText(err?.error.code)
			});
		return { action: 'update', saved: true };
	},
	delete: async ({ request, locals }) => {
		const id = String((await request.formData()).get('id'));
		const { error: err, response } = await locals.api.DELETE('/v1/admin/categories/{id}', {
			params: { path: { id } }
		});
		if (err)
			return fail(response.status, {
				action: 'delete',
				fields: {},
				message: errorText(err.error.code)
			});
		return { action: 'delete', saved: true };
	}
};
