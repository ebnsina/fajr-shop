import { fail } from '@sveltejs/kit';
import { analyse, planImport, applyImport, PRESETS, type Mapping } from '@fajr/core/import';
import { IMPORT_FIELDS } from '$lib/importFields';
import type { Actions, PageServerLoad } from './$types';
import { guardActions, requirePermission } from '$lib/server/guard';

export const load: PageServerLoad = ({ locals }) => {
	requirePermission(locals, 'catalog.write');
	return {
		presets: PRESETS.map((p) => ({ id: p.id, label: p.label })),
		fields: IMPORT_FIELDS
	};
};

function mappingFrom(form: FormData): Mapping {
	const mapping: Mapping = {};
	for (const field of IMPORT_FIELDS) {
		const column = String(form.get(`map.${field.key}`) ?? '').trim();
		if (column) mapping[field.key] = column;
	}
	return mapping;
}

export const actions: Actions = guardActions('catalog.write', {
	/** Step one: read the file, guess the preset, show what was found. */
	analyse: async ({ request }) => {
		const form = await request.formData();
		const file = form.get('file');
		if (!(file instanceof File) || file.size === 0) {
			return fail(400, { error: 'Choose a CSV file to import.' });
		}
		if (file.size > 20 * 1024 * 1024) {
			return fail(413, { error: 'That file is over 20MB. Split it and import in parts.' });
		}

		const { sheet, preset } = analyse(await file.text());
		if (sheet.headers.length === 0) {
			return fail(400, { error: 'That file has no header row.' });
		}

		const mapping = preset?.mapping ?? {};
		const plan = planImport(sheet, mapping, 'handle');

		return {
			step: 'review' as const,
			csv: await file.text(),
			headers: sheet.headers,
			rowCount: sheet.rows.length,
			presetId: preset?.id ?? null,
			mapping,
			preview: plan.products.slice(0, 5).map((p) => ({
				title: p.title,
				variants: p.variants.length,
				status: p.status,
				category: p.categoryName
			})),
			planned: plan.products.length,
			errors: plan.errors.slice(0, 20),
			errorCount: plan.errors.length
		};
	},

	/** Step two: a dry run against the merchant's own mapping. */
	dryRun: async ({ request }) => {
		const form = await request.formData();
		const csv = String(form.get('csv') ?? '');
		const { sheet } = analyse(csv);
		const mapping = mappingFrom(form);

		if (!mapping.title || !mapping.price) {
			return fail(400, { error: 'Title and price must both be mapped.', csv, headers: sheet.headers, mapping, step: 'review' as const });
		}

		const plan = planImport(sheet, mapping, mapping.handle ? 'handle' : 'title');

		return {
			step: 'review' as const,
			csv,
			headers: sheet.headers,
			rowCount: sheet.rows.length,
			mapping,
			preview: plan.products.slice(0, 5).map((p) => ({
				title: p.title,
				variants: p.variants.length,
				status: p.status,
				category: p.categoryName
			})),
			planned: plan.products.length,
			errors: plan.errors.slice(0, 20),
			errorCount: plan.errors.length,
			dryRun: true
		};
	},

	/** Step three: write it. */
	run: async ({ request }) => {
		const form = await request.formData();
		const csv = String(form.get('csv') ?? '');
		const source = String(form.get('source') ?? 'csv').trim() || 'csv';
		const oldUrlPattern = String(form.get('oldUrlPattern') ?? '').trim() || null;

		const { sheet } = analyse(csv);
		const mapping = mappingFrom(form);
		const plan = planImport(sheet, mapping, mapping.handle ? 'handle' : 'title');
		const result = await applyImport(plan, { source, oldUrlPattern });

		return { step: 'done' as const, result };
	}
});
