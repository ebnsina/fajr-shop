import { fail } from '@sveltejs/kit';
import * as v from 'valibot';
import { phoneSchema } from '$lib/kyc';
import { record, tooSoon } from '$lib/server/enquiry';

import type { Actions } from './$types';

// A feature request is a lead with a different reason for writing in, so it
// goes through the same store, the same webhook and the same rate limit.
const schema = v.object({
	name: v.pipe(v.string(), v.trim(), v.minLength(2, 'Please tell us your name.')),
	phone: phoneSchema,
	want: v.pipe(
		v.string(),
		v.trim(),
		v.minLength(10, 'Tell us a little more — one line is enough.'),
		v.maxLength(600)
	)
});

export const actions: Actions = {
	feature: async ({ request, getClientAddress }) => {
		const form = await request.formData();
		const text = (name: string) => String(form.get(name) ?? '');

		const problem = (errors: Record<string, string>) => ({
			errors,
			name: text('name'),
			phone: text('phone'),
			want: text('want')
		});

		// Bots fill every field, including the one nobody can see.
		if (text('company').trim()) return { featureSent: true };

		const parsed = v.safeParse(schema, {
			name: text('name'),
			phone: text('phone'),
			want: text('want')
		});

		if (!parsed.success) {
			const errors: Record<string, string> = {};
			for (const issue of parsed.issues) {
				const key = issue.path?.map((part) => String(part.key)).join('.') ?? 'form';
				errors[key] ??= issue.message;
			}
			return fail(400, problem(errors));
		}

		if (tooSoon(request.headers.get('cf-connecting-ip') ?? getClientAddress(), 'feature')) {
			return fail(429, problem({ form: 'We have that one already — thank you.' }));
		}

		await record({
			kind: 'feature',
			name: parsed.output.name,
			phone: parsed.output.phone,
			message: parsed.output.want
		});

		return { featureSent: true };
	}
};
