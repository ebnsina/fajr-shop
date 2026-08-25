import { fail } from '@sveltejs/kit';
import { list, upload, remove, setAlt, MAX_BYTES } from '@fajr/core/media';
import type { Actions, PageServerLoad } from './$types';
import { guardActions, requirePermission } from '$lib/server/guard';

export const load: PageServerLoad = async ({ locals }) => {
	requirePermission(locals, 'catalog.read');
	return { items: await list({ limit: 60 }) };
};

const REASONS: Record<string, string> = {
	too_large: `That file is over ${Math.round(MAX_BYTES / 1024 / 1024)}MB.`,
	unsupported_type: 'Use a JPEG, PNG, WebP, AVIF or GIF.',
	corrupt: "That file isn't a readable image."
};

export const actions: Actions = guardActions('catalog.write', {
	upload: async ({ request, locals }) => {
		const form = await request.formData();
		const files = form.getAll('files').filter((f): f is File => f instanceof File && f.size > 0);
		if (!files.length) return fail(400, { error: 'Choose at least one image.' });

		const errors: string[] = [];
		for (const file of files) {
			const result = await upload(
				{ bytes: new Uint8Array(await file.arrayBuffer()), mimeType: file.type },
				{ uploadedBy: locals.staff?.id, requestId: locals.requestId }
			);
			if (!result.ok) errors.push(`${file.name}: ${REASONS[result.reason]}`);
		}

		// Partial success is the normal case with a multi-file picker: report
		// what failed, keep what worked.
		return errors.length ? fail(400, { error: errors.join(' ') }) : { uploaded: files.length - errors.length };
	},

	alt: async ({ request }) => {
		const form = await request.formData();
		const id = String(form.get('id') ?? '');
		if (!id) return fail(400, { error: 'Missing id.' });
		await setAlt(id, String(form.get('alt') ?? '').trim() || null);
		return { saved: true };
	},

	delete: async ({ request, locals }) => {
		const form = await request.formData();
		const id = String(form.get('id') ?? '');
		if (!id) return fail(400, { error: 'Missing id.' });
		await remove(id, { actorId: locals.staff?.id });
		return { deleted: true };
	}
});
