import { redirect, fail } from '@sveltejs/kit';
import { listPages, createPage, duplicatePage, deletePage, setHome } from '@fajr/core/cms';
import type { Actions, PageServerLoad } from './$types';
import { guardActions, requirePermission } from '$lib/server/guard';

export const load: PageServerLoad = async ({ locals }) => {
	requirePermission(locals, 'cms.read');
	return { pages: await listPages() };
};

export const actions: Actions = guardActions('cms.write', {
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
});
