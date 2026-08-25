import { inbox, enabledChannels } from '@fajr/core/chat';
import { requirePermission } from '$lib/server/guard';

import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	requirePermission(locals, 'order.read');

	const status = (url.searchParams.get('status') ?? 'open') as 'open' | 'snoozed' | 'closed';
	const [threads, channels] = await Promise.all([inbox(status), enabledChannels()]);

	return { threads, status, channels };
};
