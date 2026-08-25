import { error, fail } from '@sveltejs/kit';
import * as v from 'valibot';
import { DEMOS } from '$lib/content';
import { kycSchema, fieldErrors } from '$lib/kyc';
import { credentialsFor } from '$lib/server/demos';
import { record, tooSoon } from '$lib/server/enquiry';

import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ params }) => {
	const demo = DEMOS.find((d) => d.key === params.vertical);
	if (!demo) error(404, 'We do not have a demo shop for that trade.');
	return {
		demo,
		meta: {
			title: `${demo.shop} demo — ${demo.label} — Fajr Shop`,
			description: `${demo.tagline} A working storefront and admin with ${demo.products} products, reset nightly.`
		}
	};
};

export const actions: Actions = {
	default: async ({ request, params, getClientAddress }) => {
		const demo = DEMOS.find((d) => d.key === params.vertical);
		if (!demo) error(404, 'We do not have a demo shop for that trade.');

		const form = await request.formData();
		const text = (name: string) => String(form.get(name) ?? '');
		// One shape for every failure path, so the form can read it without narrowing.
		const problem = (errors: Record<string, string>) => ({
			errors,
			name: text('name'),
			phone: text('phone'),
			shop: text('shop'),
			orders: text('orders'),
			selling: text('selling')
		});

		// Bots fill every field, including the one nobody can see.
		if (String(form.get('company') ?? '').trim()) {
			return fail(400, problem({ form: 'Something went wrong. Please try again.' }));
		}

		const parsed = v.safeParse(kycSchema, {
			name: text('name'),
			phone: text('phone'),
			shop: text('shop'),
			orders: text('orders'),
			selling: text('selling')
		});

		if (!parsed.success) return fail(400, problem(fieldErrors(parsed.issues)));

		if (tooSoon(request.headers.get('cf-connecting-ip') ?? getClientAddress(), 'demo')) {
			return fail(
				429,
				problem({
					form: 'We already have that one. Check your messages — the details are on their way.'
				})
			);
		}

		let credentials;
		try {
			credentials = credentialsFor(demo.key);
		} catch (err) {
			// Missing config is ours to fix, and the visitor should not see a stack trace.
			console.error(String(err));
			error(503, 'The demo shops are being updated. Please call us and we will walk you through one.');
		}

		if (!credentials) error(404, 'We do not have a demo shop for that trade.');

		await record({
			kind: 'demo',
			demo: demo.shop,
			name: parsed.output.name,
			phone: parsed.output.phone,
			shop: parsed.output.shop,
			ordersBand: parsed.output.orders,
			selling: parsed.output.selling
		});

		return { credentials };
	}
};
