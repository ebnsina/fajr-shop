import { getSettings } from '@fajr/core/settings';

import type { LayoutServerLoad } from './$types';

// hooks.server.ts already redirected anyone without a session.
export const load: LayoutServerLoad = async ({ locals }) => {
	const settings = await getSettings();
	return { staff: locals.staff, storeName: settings.storeName };
};
