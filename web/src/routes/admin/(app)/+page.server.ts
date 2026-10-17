import { redirect } from '@sveltejs/kit';

// No overview yet; the dashboard opens on the products until orders exist to summarise.
export const load = () => redirect(307, '/admin/products');
