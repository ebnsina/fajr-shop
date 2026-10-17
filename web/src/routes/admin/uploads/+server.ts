import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// Passes one image from the dashboard to the API with the signed-in person's token.
export const POST: RequestHandler = async ({ request, locals }) => {
	const form = await request.formData().catch(() => null);
	const file = form?.get('file');
	if (!(file instanceof File)) return json({ code: 'validation' }, { status: 400 });

	const body = new FormData();
	body.set('file', file, file.name);
	const { data, error, response } = await locals.api.POST('/v1/admin/uploads', {
		// The schema types the part as a string; openapi-fetch passes FormData through untouched.
		body: body as unknown as { file: string },
		bodySerializer: (b) => b as unknown as FormData
	});
	if (!data) return json({ code: error?.error.code ?? 'internal' }, { status: response.status });
	return json(data, { status: 201 });
};
