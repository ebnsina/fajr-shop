import { fail } from '@sveltejs/kit';
import {
	categoryTree, createCategory, updateCategory, moveCategory, deleteCategory,
	attributesFor, saveAttribute, deleteAttribute
} from '@fajr/core/catalog';
import type { Actions, PageServerLoad } from './$types';
import { guardActions, requirePermission } from '$lib/server/guard';

export const load: PageServerLoad = async ({ url, locals }) => {
	requirePermission(locals, 'catalog.read');

	const tree = await categoryTree();
	// Attributes are edited one category at a time; the tree stays a tree.
	const editing = url.searchParams.get('attrs');
	return { tree, editing, attributes: editing ? await attributesFor(editing) : [] };
};

export const actions: Actions = guardActions('catalog.write', {
	create: async ({ request }) => {
		const form = await request.formData();
		const name = String(form.get('name') ?? '').trim();
		if (!name) return fail(400, { error: 'Give the category a name.' });
		await createCategory({ name, parentId: (form.get('parentId') as string) || null });
		return { created: true };
	},

	rename: async ({ request }) => {
		const form = await request.formData();
		const name = String(form.get('name') ?? '').trim();
		if (!name) return fail(400, { error: 'A category needs a name.' });
		await updateCategory(String(form.get('id')), { name });
		return { renamed: true };
	},

	move: async ({ request }) => {
		const form = await request.formData();
		try {
			await moveCategory(String(form.get('id')), (form.get('parentId') as string) || null);
		} catch (err) {
			// The only expected failure is moving a branch into itself.
			return fail(400, { error: err instanceof Error ? err.message : 'Could not move that category.' });
		}
		return { moved: true };
	},

	delete: async ({ request }) => {
		const form = await request.formData();
		await deleteCategory(String(form.get('id')));
		return { deleted: true };
	},

	attribute: async ({ request }) => {
		const form = await request.formData();
		const name = String(form.get('name') ?? '').trim();
		if (!name) return fail(400, { error: 'Give the attribute a name.' });

		await saveAttribute({
			id: String(form.get('id') ?? '') || undefined,
			categoryId: String(form.get('categoryId')),
			name,
			unit: String(form.get('unit') ?? '').trim() || null,
			isFilterable: form.get('isFilterable') === 'on',
			sort: Number(form.get('sort') ?? 0)
		});
		return { saved: true };
	},

	deleteAttribute: async ({ request }) => {
		const form = await request.formData();
		await deleteAttribute(String(form.get('id')));
		return { deleted: true };
	}
});
