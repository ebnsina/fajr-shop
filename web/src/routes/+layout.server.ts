import { error } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	const { data } = await locals.api.GET('/v1/store');
	if (!data) error(503, 'The shop is unavailable');
	return { store: data };
};
