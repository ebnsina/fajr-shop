import { redirect, fail } from '@sveltejs/kit';
import { getSettings, updateSettings, advanceSetup, finishSetup, saveZone, listZones, type SetupStep } from '@fajr/core/settings';
import { createStaff } from '@fajr/core/staff';
import { db, role, asc } from '@fajr/db';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const settings = await getSettings();
	// Finished merchants land on the dashboard, not back at step one.
	if (!settings.setupStep) redirect(303, '/admin');

	const [zones, roles] = await Promise.all([
		listZones(),
		db.read.select({ id: role.id, name: role.name }).from(role).orderBy(asc(role.name))
	]);

	return { settings, step: settings.setupStep as SetupStep, zones, roles };
};

const taka = (v: FormDataEntryValue | null) => Math.round(Number(String(v ?? 0)) * 100);

export const actions: Actions = {
	store: async ({ request }) => {
		const form = await request.formData();
		const name = String(form.get('storeName') ?? '').trim();
		if (!name) return fail(400, { error: 'The store needs a name.' });

		await updateSettings({
			storeName: name,
			supportPhone: String(form.get('supportPhone') ?? '').trim() || null,
			vatRegistered: form.get('vatRegistered') === 'on',
			vatBin: String(form.get('vatBin') ?? '').trim() || null
		});
		await advanceSetup('store');
		return { done: true };
	},

	theme: async ({ request }) => {
		const form = await request.formData();
		await updateSettings({ theme: (form.get('theme') === 'tech' ? 'tech' : 'fashion') as 'fashion' | 'tech' });
		await advanceSetup('theme');
		return { done: true };
	},

	/** Fresh or import — the only branch in the whole wizard. */
	catalog: async ({ request }) => {
		const form = await request.formData();
		await advanceSetup('catalog');
		if (form.get('choice') === 'import') redirect(303, '/admin/products/import');
		return { done: true };
	},

	delivery: async ({ request }) => {
		const form = await request.formData();
		const inside = taka(form.get('inside'));
		const outside = taka(form.get('outside'));

		// Two zones is what a BD shop needs on day one; more is a settings job.
		await saveZone(String(form.get('insideId') ?? '') || null, {
			name: 'Inside Dhaka',
			districts: ['Dhaka'],
			chargeMinor: inside,
			advanceMinor: inside,
			freeOverMinor: taka(form.get('freeOver')) || null,
			sort: 0,
			isActive: true
		});
		await saveZone(String(form.get('outsideId') ?? '') || null, {
			name: 'Outside Dhaka',
			districts: [],
			chargeMinor: outside,
			advanceMinor: outside,
			freeOverMinor: taka(form.get('freeOver')) || null,
			sort: 1,
			isActive: true
		});

		await advanceSetup('delivery');
		return { done: true };
	},

	payments: async () => {
		// COD and manual bKash need no credentials, which is why they are the
		// launch configuration. Gateways are added in settings later.
		await advanceSetup('payments');
		return { done: true };
	},

	staff: async ({ request }) => {
		const form = await request.formData();
		const email = String(form.get('email') ?? '').trim();

		if (email) {
			const password = String(form.get('password') ?? '');
			if (password.length < 8) return fail(400, { error: 'A staff password needs at least 8 characters.' });
			await createStaff({
				email,
				password,
				name: String(form.get('name') ?? '').trim() || email,
				roleId: String(form.get('roleId') ?? 'staff')
			});
		}

		await finishSetup();
		redirect(303, '/admin');
	},

	skip: async ({ request }) => {
		const form = await request.formData();
		await advanceSetup(String(form.get('step')) as SetupStep);
		return { done: true };
	}
};
