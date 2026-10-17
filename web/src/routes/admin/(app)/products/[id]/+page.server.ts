import { error, fail, redirect } from '@sveltejs/kit';
import { errorText } from '#lib/copy.js';
import type { components } from '#lib/api.js';
import type { Actions, PageServerLoad } from './$types';

type ProductInput = components['schemas']['ProductInput'];
type Reason = components['schemas']['StockAdjustment']['reason'];

export const load: PageServerLoad = async ({ locals, params }) => {
	const [product, cats] = await Promise.all([
		params.id === 'new'
			? null
			: locals.api.GET('/v1/admin/products/{id}', { params: { path: { id: params.id } } }),
		locals.api.GET('/v1/categories')
	]);
	if (product && !product.data) {
		error(product.response.status, errorText(product.error?.error.code));
	}
	if (!cats.data) error(cats.response.status, errorText(cats.error?.error.code));
	return { product: product?.data ?? null, categories: cats.data.items };
};

export const actions: Actions = {
	save: async ({ request, locals, params }) => {
		let body: ProductInput;
		try {
			body = JSON.parse(String((await request.formData()).get('payload')));
		} catch {
			return fail(400, { fields: {}, message: errorText('validation') });
		}
		const res =
			params.id === 'new'
				? await locals.api.POST('/v1/admin/products', { body })
				: await locals.api.PUT('/v1/admin/products/{id}', {
						params: { path: { id: params.id } },
						body
					});
		if (!res.data) {
			return fail(400, {
				fields: res.error?.error.fields ?? {},
				message: errorText(res.error?.error.code)
			});
		}
		if (params.id === 'new') redirect(303, `/admin/products/${res.data.id}`);
		return { saved: true };
	},

	adjust: async ({ request, locals }) => {
		const form = await request.formData();
		const { data, error: err } = await locals.api.POST(
			'/v1/admin/variants/{id}/stock-adjustments',
			{
				params: { path: { id: String(form.get('variant')) } },
				body: {
					delta: Number(form.get('delta')),
					reason: String(form.get('reason')) as Reason,
					note: String(form.get('note') ?? '').trim() || undefined
				}
			}
		);
		if (!data) {
			return fail(400, {
				adjustError: errorText(err?.error.code),
				fields: err?.error.fields ?? {}
			});
		}
		return { adjusted: true };
	},

	delete: async ({ locals, params }) => {
		const { error: err, response } = await locals.api.DELETE('/v1/admin/products/{id}', {
			params: { path: { id: params.id } }
		});
		if (err) return fail(response.status, { fields: {}, message: errorText(err.error.code) });
		redirect(303, '/admin/products');
	}
};
