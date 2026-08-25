import { getSettings } from '@fajr/core/settings';

import type { LayoutServerLoad } from './$types';

// hooks.server.ts already redirected anyone without a session.
export const load: LayoutServerLoad = async ({ locals }) => {
	const settings = await getSettings();
	return {
		staff: locals.staff,
		storeName: settings.storeName,
		currency: settings.currency,
		// BCP-47 for Intl. The admin reads Western digits regardless of the
		// storefront's locale, because staff compare numbers all day.
		numberLocale: `en-${settings.country}`
	};
};
