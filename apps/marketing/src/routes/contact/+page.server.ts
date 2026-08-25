import { fail } from '@sveltejs/kit';
import * as v from 'valibot';
import { PLANS } from '$lib/content';
import { phoneSchema } from '$lib/kyc';
import { record, tooSoon } from '$lib/server/enquiry';

import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ url }) => ({
	plan: PLANS.find((p) => p.id === url.searchParams.get('plan'))?.id ?? null
});

const schema = v.object({
	name: v.pipe(v.string(), v.trim(), v.minLength(2, 'Please tell us your name.')),
	phone: phoneSchema,
	shop: v.pipe(v.string(), v.trim(), v.maxLength(120)),
	orders: v.pipe(v.string(), v.trim(), v.maxLength(40)),
	message: v.pipe(v.string(), v.trim(), v.maxLength(1000))
});

export const actions: Actions = {
	default: async ({ request, getClientAddress }) => {
		const form = await request.formData();
		const text = (name: string) => String(form.get(name) ?? '');

		const problem = (errors: Record<string, string>) => ({
			errors,
			name: text('name'),
			phone: text('phone'),
			shop: text('shop'),
			orders: text('orders'),
			message: text('message')
		});

		// Bots fill every field, including the one nobody can see.
		if (text('company').trim()) return { sent: true };

		const parsed = v.safeParse(schema, {
			name: text('name'),
			phone: text('phone'),
			shop: text('shop'),
			orders: text('orders'),
			message: text('message')
		});

		if (!parsed.success) {
			const errors: Record<string, string> = {};
			for (const issue of parsed.issues) {
				const key = issue.path?.map((part) => String(part.key)).join('.') ?? 'form';
				errors[key] ??= issue.message;
			}
			return fail(400, problem(errors));
		}

		if (tooSoon(request.headers.get('cf-connecting-ip') ?? getClientAddress(), 'contact')) {
			return fail(429, problem({ form: 'We already have that one — we will call you shortly.' }));
		}

		await record({
			kind: 'contact',
			name: parsed.output.name,
			phone: parsed.output.phone,
			shop: parsed.output.shop,
			ordersBand: parsed.output.orders,
			message: [text('plan') && `plan: ${text('plan')}`, parsed.output.message]
				.filter(Boolean)
				.join(' · ')
		});

		return { sent: true };
	}
};
