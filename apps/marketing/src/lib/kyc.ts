import * as v from 'valibot';

// Every market we sell into, not just Bangladesh: a Dubai merchant filling in
// this form must not be told their own number is invalid.
export const phoneSchema = v.pipe(
	v.string(),
	v.trim(),
	v.transform((raw) => raw.replace(/[\s()-]/g, '')),
	v.regex(
		// BD, UAE, Saudi, Kuwait, Qatar, Bahrain, Oman, Pakistan.
		/^(\+?(88)?01[3-9]\d{8}|\+?(971|966|965|974|973|968|92)\d{7,10})$/,
		'Please enter a mobile number we can reach you on, including the country code.'
	)
);

// Shared by the client (before submit) and the server (before trusting it),
// so both sides reject the same things with the same words.
export const kycSchema = v.object({
	name: v.pipe(v.string(), v.trim(), v.minLength(2, 'Please tell us your name.')),
	phone: phoneSchema,
	shop: v.pipe(v.string(), v.trim(), v.minLength(2, 'Please tell us your shop or page name.')),
	orders: v.picklist(
		['under-100', '100-500', '500-1500', 'over-1500'],
		'Please pick roughly how many orders you take.'
	),
	selling: v.pipe(v.string(), v.trim(), v.maxLength(200))
});

export type Kyc = v.InferOutput<typeof kycSchema>;

export const ORDER_BANDS = [
	{ value: 'under-100', label: 'Under 100 a month' },
	{ value: '100-500', label: '100 to 500 a month' },
	{ value: '500-1500', label: '500 to 1,500 a month' },
	{ value: 'over-1500', label: 'More than 1,500 a month' }
] as const;

// One place to turn a valibot failure into per-field messages for the form.
export function fieldErrors(issues: v.BaseIssue<unknown>[]): Record<string, string> {
	const out: Record<string, string> = {};
	for (const issue of issues) {
		const key = issue.path?.map((p) => String(p.key)).join('.') ?? '';
		if (key && !out[key]) out[key] = issue.message;
	}
	return out;
}
