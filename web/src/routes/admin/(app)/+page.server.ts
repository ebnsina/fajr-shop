import { error } from '@sveltejs/kit';
import { errorText } from '#lib/copy.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const [overview, activity] = await Promise.all([
		locals.api.GET('/v1/admin/overview'),
		locals.api.GET('/v1/admin/audit-log', { params: { query: { limit: 8 } } })
	]);
	if (!overview.data) error(overview.response.status, errorText(overview.error?.error.code));
	// Staff may not read the activity log; their overview just leaves it out.
	return { overview: overview.data, activity: activity.data?.items ?? null };
};
