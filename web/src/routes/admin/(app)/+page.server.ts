import { redirect } from '@sveltejs/kit';

// No overview yet; the dashboard opens on the store settings until orders exist to summarise.
export const load = () => redirect(307, '/admin/settings/store');
