import { error, fail } from '@sveltejs/kit';
import type { components } from '#lib/api.js';
import { errorText } from '#lib/copy.js';
import type { Actions, PageServerLoad } from './$types';

type Placement = components['schemas']['BannerPlacement'];

export const load: PageServerLoad = async ({ locals }) => {
	const { data, error: err, response } = await locals.api.GET('/v1/admin/banners');
	if (!data) error(response.status, errorText(err?.error.code));
	return { banners: data.items };
};

function input(form: FormData) {
	return {
		placement: String(form.get('placement') ?? 'hero') as Placement,
		image_id: String(form.get('image_id') ?? ''),
		alt: String(form.get('alt') ?? '').trim(),
		link: String(form.get('link') ?? '').trim() || null,
		position: Number(form.get('position') ?? 0) || 0,
		active: form.has('active')
	};
}

const failure = (
	action: string,
	err?: { error: { code: string; fields?: Record<string, string> } }
) => fail(400, { action, fields: err?.error.fields ?? {}, message: errorText(err?.error.code) });

export const actions: Actions = {
	create: async ({ request, locals }) => {
		const body = input(await request.formData());
		if (!body.image_id)
			return fail(400, {
				action: 'create',
				fields: { image_id: 'Upload a picture.' },
				message: ''
			});
		const { data, error: err } = await locals.api.POST('/v1/admin/banners', { body });
		if (!data) return failure('create', err);
		return { action: 'create', saved: true };
	},
	update: async ({ request, locals }) => {
		const form = await request.formData();
		const body = input(form);
		if (!body.image_id)
			return fail(400, {
				action: 'update',
				fields: { image_id: 'Upload a picture.' },
				message: ''
			});
		const { data, error: err } = await locals.api.PUT('/v1/admin/banners/{id}', {
			params: { path: { id: String(form.get('id')) } },
			body
		});
		if (!data) return failure('update', err);
		return { action: 'update', saved: true };
	},
	delete: async ({ request, locals }) => {
		const id = String((await request.formData()).get('id'));
		const { error: err } = await locals.api.DELETE('/v1/admin/banners/{id}', {
			params: { path: { id } }
		});
		if (err) return failure('delete', err);
		return { action: 'delete', saved: true };
	}
};
