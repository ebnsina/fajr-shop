import type { LayoutServerLoad } from './$types';

/** hooks.server.ts already redirected anyone without a session. */
export const load: LayoutServerLoad = ({ locals }) => ({ staff: locals.staff });
