import { fail } from '@sveltejs/kit';
import { errorText } from '#lib/copy.js';
import type { components } from '#lib/api.js';
import type { Actions, PageServerLoad } from './$types';

type Store = components['schemas']['Store'];

export const load: PageServerLoad = async ({ parent }) => ({
	store: (await parent()).store
});

const text = (form: FormData, key: string) => String(form.get(key) ?? '').trim();

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const form = await request.formData();
		const rate = Number(form.get('vat_rate'));
		const body: Store = {
			name: text(form, 'name'),
			currency: 'BDT',
			logo_url: text(form, 'logo_url') || null,
			accent_color: text(form, 'accent_color') || null,
			contact_phone: text(form, 'contact_phone') || null,
			contact_email: text(form, 'contact_email') || null,
			vat: {
				enabled: form.has('vat_enabled'),
				rate_bp: Number.isFinite(rate) ? Math.round(rate * 100) : 0,
				prices_include_vat: form.has('prices_include_vat'),
				bin: text(form, 'vat_bin') || null
			}
		};
		const { data, error } = await locals.api.PUT('/v1/admin/store', { body });
		if (!data) {
			return fail(400, {
				message: errorText(error?.error.code),
				fields: error?.error.fields ?? {},
				values: body
			});
		}
		return { saved: true };
	}
};
