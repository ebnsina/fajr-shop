import { error, fail } from '@sveltejs/kit';
import {
	editablePage, updatePage, addBlock, updateBlock, deleteBlock, reorderBlocks, setBlockVisible
} from '@fajr/core/cms';
import { list as listMedia } from '@fajr/core/media';
import { BLOCK_TYPES, BLOCK_LABELS, parseProps } from '@fajr/schemas';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const page = await editablePage(params.id);
	if (!page) error(404, 'Page not found');

	return {
		page,
		media: await listMedia({ limit: 120 }),
		blockTypes: BLOCK_TYPES.map((t) => ({ type: t, label: BLOCK_LABELS[t] }))
	};
};

export const actions: Actions = {
	settings: async ({ request, params }) => {
		const form = await request.formData();
		const unpublishAt = String(form.get('unpublishAt') ?? '');

		await updatePage(params.id, {
			title: String(form.get('title') ?? '').trim(),
			slug: String(form.get('slug') ?? '').trim() || String(form.get('title') ?? ''),
			status: form.get('status') === 'published' ? 'published' : 'draft',
			metaTitle: String(form.get('metaTitle') ?? '') || null,
			metaDescription: String(form.get('metaDescription') ?? '') || null,
			pixelId: String(form.get('pixelId') ?? '') || null,
			// A local datetime from the browser; stored as an instant like everything else.
			unpublishAt: unpublishAt ? new Date(unpublishAt) : null
		});
		return { saved: true };
	},

	add: async ({ request, params }) => {
		const form = await request.formData();
		const id = await addBlock(params.id, String(form.get('type') ?? ''));
		return id ? { added: id } : fail(400, { error: 'Unknown block type.' });
	},

	/** The editor posts the props it is showing; the block's schema validates them. */
	block: async ({ request }) => {
		const form = await request.formData();
		const id = String(form.get('id') ?? '');
		let props: unknown;
		try {
			props = JSON.parse(String(form.get('props') ?? '{}'));
		} catch {
			return fail(400, { error: 'Could not read that block.' });
		}
		const ok = await updateBlock(id, props);
		return ok ? { saved: true } : fail(400, { error: 'That block no longer exists.' });
	},

	visibility: async ({ request }) => {
		const form = await request.formData();
		await setBlockVisible(String(form.get('id')), form.get('visible') === 'true');
		return { saved: true };
	},

	remove: async ({ request }) => {
		const form = await request.formData();
		await deleteBlock(String(form.get('id')));
		return { saved: true };
	},

	reorder: async ({ request, params }) => {
		const form = await request.formData();
		const ids = String(form.get('order') ?? '').split(',').filter(Boolean);
		await reorderBlocks(params.id, ids);
		return { saved: true };
	}
};
