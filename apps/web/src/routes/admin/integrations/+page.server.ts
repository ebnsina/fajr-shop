import { fail } from '@sveltejs/kit';
import { listIntegrations, saveIntegration, setEnabled, uninstall, listingFor } from '@fajr/core/integrations';
import { getSettings } from '@fajr/core/settings';
import { guardActions, requirePermission } from '$lib/server/guard';

import type { Actions, PageServerLoad } from './$types';

// The shop's own country decides which integrations are worth showing. A Dhaka
// merchant should not scroll past Tamara to reach Steadfast.
const REGION_OF: Record<string, 'south-asia' | 'middle-east'> = {
	BD: 'south-asia', PK: 'south-asia', IN: 'south-asia',
	AE: 'middle-east', SA: 'middle-east', KW: 'middle-east',
	QA: 'middle-east', BH: 'middle-east', OM: 'middle-east'
};

export const load: PageServerLoad = async ({ locals, url }) => {
	requirePermission(locals, 'setting.write');

	const settings = await getSettings();
	const region = REGION_OF[settings.country] ?? 'south-asia';
	const showAll = url.searchParams.get('all') === '1';

	return {
		items: await listIntegrations(showAll ? undefined : region),
		region,
		showAll,
		configuring: url.searchParams.get('configure')
	};
};

export const actions: Actions = guardActions('setting.write', {
	save: async ({ request, locals }) => {
		const form = await request.formData();
		const slug = String(form.get('slug') ?? '');

		const listing = listingFor(slug);
		if (!listing) return fail(400, { error: 'That integration does not exist.' });

		const input: Record<string, string> = {};
		for (const field of listing.fields) input[field.key] = String(form.get(field.key) ?? '');

		const result = await saveIntegration(slug, input, { actorId: locals.staff?.id });
		if (!result.ok) {
			return fail(400, {
				slug,
				error: `${listing.name} still needs: ${result.missing.join(', ')}.`
			});
		}
		return { saved: slug };
	},

	toggle: async ({ request, locals }) => {
		const form = await request.formData();
		await setEnabled(
			String(form.get('slug') ?? ''),
			form.get('enabled') === 'true',
			{ actorId: locals.staff?.id }
		);
		return { done: true };
	},

	uninstall: async ({ request, locals }) => {
		const form = await request.formData();
		await uninstall(String(form.get('slug') ?? ''), { actorId: locals.staff?.id });
		return { done: true };
	}
});
