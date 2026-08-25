import { redirect, fail } from '@sveltejs/kit';
import { listPages, createPage, duplicatePage, deletePage, setHome } from '@fajr/core/cms';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => ({ pages: await listPages() });

export const actions: Actions = {
	create: async ({ request }) => {
		const form = await request.formData();
		const title = String(form.get('title') ?? '').trim();
		if (!title) return fail(400, { error: 'Give the page a title.' });
		redirect(303, `/admin/pages/${await createPage({ title })}`);
	},

	duplicate: async ({ request }) => {
		const form = await request.formData();
		redirect(303, `/admin/pages/${await duplicatePage(String(form.get('id')))}`);
	},

	home: async ({ request }) => {
		const form = await request.formData();
		await setHome(String(form.get('id')));
		return { done: true };
	},

	delete: async ({ request }) => {
		const form = await request.formData();
		await deletePage(String(form.get('id')));
		return { done: true };
	}
};
