import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { upload, list, remove, setAlt, MAX_BYTES } from '@fajr/core/media';
import type { Env } from '../app.ts';
import { requireAdmin } from '../auth.ts';

const mediaShape = z.object({
	id: z.string(),
	key: z.string(),
	url: z.string(),
	mimeType: z.string(),
	sizeBytes: z.number(),
	width: z.number().nullable(),
	height: z.number().nullable(),
	alt: z.string().nullable(),
	createdAt: z.string()
});

const json = (schema: z.ZodTypeAny, description: string) => ({
	description,
	content: { 'application/json': { schema } }
});

export const mediaRoutes = new OpenAPIHono<Env>();

mediaRoutes.use('/api/v1/media', requireAdmin);
mediaRoutes.use('/api/v1/media/*', requireAdmin);

mediaRoutes.openapi(
	createRoute({
		method: 'get',
		path: '/api/v1/media',
		summary: 'List media, newest first',
		tags: ['media'],
		request: { query: z.object({ limit: z.coerce.number().int().min(1).max(200).optional() }) },
		responses: { 200: json(z.array(mediaShape), 'Media items') }
	}),
	async (c) => {
		const items = await list({ limit: c.req.valid('query').limit });
		return c.json(items.map((m) => ({ ...m, createdAt: m.createdAt.toISOString() })));
	}
);

mediaRoutes.openapi(
	createRoute({
		method: 'post',
		path: '/api/v1/media',
		summary: 'Upload an image',
		description: `Multipart form with a \`file\` field. Max ${MAX_BYTES} bytes. The stored type is read from the bytes, not the declared content type.`,
		tags: ['media'],
		request: {
			body: {
				content: {
					'multipart/form-data': {
						schema: z.object({ file: z.any(), alt: z.string().optional() })
					}
				}
			}
		},
		responses: {
			201: json(mediaShape, 'Uploaded'),
			400: json(z.object({ error: z.string() }), 'Rejected'),
			413: json(z.object({ error: z.string() }), 'Too large')
		}
	}),
	async (c) => {
		const form = await c.req.formData();
		const file = form.get('file');
		if (!(file instanceof File)) return c.json({ error: 'file_required' }, 400);

		const result = await upload(
			{
				bytes: new Uint8Array(await file.arrayBuffer()),
				mimeType: file.type,
				alt: (form.get('alt') as string | null) ?? null
			},
			{ uploadedBy: c.get('user')!.userId, requestId: c.get('requestId') }
		);

		if (!result.ok) {
			return c.json({ error: result.reason }, result.reason === 'too_large' ? 413 : 400);
		}
		return c.json({ ...result.item, createdAt: result.item.createdAt.toISOString() }, 201);
	}
);

mediaRoutes.openapi(
	createRoute({
		method: 'patch',
		path: '/api/v1/media/{id}',
		summary: 'Update alt text',
		tags: ['media'],
		request: {
			params: z.object({ id: z.string() }),
			body: { content: { 'application/json': { schema: z.object({ alt: z.string().nullable() }) } } }
		},
		responses: { 200: json(z.object({ ok: z.literal(true) }), 'Updated') }
	}),
	async (c) => {
		await setAlt(c.req.valid('param').id, c.req.valid('json').alt);
		return c.json({ ok: true as const });
	}
);

mediaRoutes.openapi(
	createRoute({
		method: 'delete',
		path: '/api/v1/media/{id}',
		summary: 'Delete media',
		tags: ['media'],
		request: { params: z.object({ id: z.string() }) },
		responses: { 200: json(z.object({ ok: z.literal(true) }), 'Deleted') }
	}),
	async (c) => {
		await remove(c.req.valid('param').id, { actorId: c.get('user')!.userId });
		return c.json({ ok: true as const });
	}
);
