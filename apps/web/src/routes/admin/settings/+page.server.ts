import { fail } from '@sveltejs/kit';
import { getSettings, updateSettings, listZones, saveZone, deleteZone } from '@fajr/core/settings';
import { list as listMedia } from '@fajr/core/media';
import { BD_DISTRICTS } from '@fajr/schemas';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const [settings, zones, media] = await Promise.all([getSettings(), listZones(), listMedia({ limit: 60 })]);
	return { settings, zones, media, districts: BD_DISTRICTS };
};

const taka = (v: FormDataEntryValue | null) => Math.round(Number(String(v ?? 0)) * 100);

export const actions: Actions = {
	store: async ({ request }) => {
		const form = await request.formData();
		const name = String(form.get('storeName') ?? '').trim();
		if (!name) return fail(400, { error: 'The store needs a name.' });

		const text = (field: string) => String(form.get(field) ?? '').trim() || null;

		await updateSettings({
			storeName: name,
			tagline: text('tagline'),
			announcement: text('announcement'),
			supportHours: text('supportHours'),
			supportPhone: String(form.get('supportPhone') ?? '').trim() || null,
			supportEmail: String(form.get('supportEmail') ?? '').trim() || null,
			logoMediaId: String(form.get('logoMediaId') ?? '') || null,
			defaultLocale: String(form.get('defaultLocale') ?? 'bn'),
			theme: (form.get('theme') === 'tech' ? 'tech' : 'fashion') as 'fashion' | 'tech'
		});
		return { saved: 'store' };
	},

	tax: async ({ request }) => {
		const form = await request.formData();
		const registered = form.get('vatRegistered') === 'on';
		const bin = String(form.get('vatBin') ?? '').trim();

		// An unregistered shop must not print a Mushak form, and a registered one
		// without a BIN would print an invalid one.
		if (registered && !bin) {
			return fail(400, { error: 'A VAT-registered shop needs its BIN before invoices can be issued.' });
		}

		await updateSettings({
			vatRegistered: registered,
			vatBin: bin || null,
			// Percent in the form, basis points in the database.
			vatRateBp: Math.round(Number(String(form.get('vatRate') ?? 0)) * 100),
			vatInclusivePricing: form.get('vatInclusivePricing') === 'on'
		});
		return { saved: 'tax' };
	},

	zone: async ({ request }) => {
		const form = await request.formData();
		const name = String(form.get('name') ?? '').trim();
		if (!name) return fail(400, { error: 'Give the zone a name.' });

		const free = String(form.get('freeOver') ?? '').trim();

		await saveZone(String(form.get('id') ?? '') || null, {
			name,
			// Empty means "everywhere not matched by another zone".
			districts: String(form.get('districts') ?? '')
				.split(',')
				.map((d) => d.trim())
				.filter(Boolean),
			chargeMinor: taka(form.get('charge')),
			advanceMinor: taka(form.get('advance')),
			freeOverMinor: free ? taka(free) : null,
			sort: Number(form.get('sort') ?? 0),
			isActive: form.get('isActive') === 'on'
		});
		return { saved: 'zone' };
	},

	deleteZone: async ({ request }) => {
		const form = await request.formData();
		await deleteZone(String(form.get('id')));
		return { saved: 'zone' };
	}
};
