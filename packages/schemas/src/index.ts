import { z } from 'zod';

/** BD mobile numbers, normalised to E.164. The customer's primary identity. */
export const phoneE164 = z
	.string()
	.trim()
	.transform((v) => v.replace(/[\s-]/g, ''))
	.pipe(z.string().regex(/^\+[1-9]\d{7,14}$/, 'Enter a valid phone number with country code'));

/** Accepts 01712345678, 8801712345678, +8801712345678. */
export const bdPhone = z
	.string()
	.trim()
	.transform((v) => {
		const d = v.replace(/\D/g, '');
		if (d.startsWith('880')) return `+${d}`;
		if (d.startsWith('0')) return `+880${d.slice(1)}`;
		if (d.length === 10) return `+880${d}`;
		return `+${d}`;
	})
	.pipe(phoneE164);

export const otpCode = z.string().trim().regex(/^\d{6}$/, 'Enter the 6-digit code');

export const adminLogin = z.object({
	email: z.string().trim().toLowerCase().email(),
	password: z.string().min(8)
});

export const otpRequest = z.object({ phone: bdPhone });
export const otpVerify = z.object({ phone: bdPhone, code: otpCode });

export type AdminLogin = z.infer<typeof adminLogin>;
export type OtpRequest = z.infer<typeof otpRequest>;
export type OtpVerify = z.infer<typeof otpVerify>;

// ── catalog ─────────────────────────────────────────────────────────────────

/** Taka in the form, minor units in the database. Never a float in between. */
export const takaToMinor = (v: string | number): number => {
	const n = typeof v === 'number' ? v : Number(String(v).replace(/,/g, '').trim());
	if (!Number.isFinite(n)) return 0;
	return Math.round(n * 100);
};

export const minorToTaka = (minor: number): string => (minor / 100).toFixed(2);

export const optionValueInput = z.object({
	value: z.string().trim().min(1, 'Give the value a name'),
	swatchHex: z
		.string()
		.regex(/^#[0-9a-fA-F]{6}$/, 'Use a hex colour like #a31d2b')
		.nullish()
});

export const optionInput = z.object({
	name: z.string().trim().min(1, 'Name this option'),
	values: z.array(optionValueInput).min(1, 'Add at least one value')
});

export const variantInput = z.object({
	id: z.string().optional(),
	/** Human key for matching a row back to its option combination. */
	key: z.string().default(''),
	sku: z.string().trim().max(64).nullish(),
	price: z.coerce.number().min(0, 'Price cannot be negative'),
	compareAt: z.coerce.number().min(0).nullish(),
	cost: z.coerce.number().min(0).nullish(),
	stockOnHand: z.coerce.number().int().min(0).default(0),
	allowBackorder: z.boolean().default(false),
	isActive: z.boolean().default(true)
});

export const productForm = z.object({
	title: z.string().trim().min(1, 'A product needs a title').max(200),
	slug: z.string().trim().max(80).default(''),
	summary: z.string().trim().max(300).nullish(),
	description: z.string().nullish(),
	status: z.enum(['draft', 'active', 'archived']).default('draft'),
	categoryId: z.string().nullish(),
	brandId: z.string().nullish(),
	metaTitle: z.string().trim().max(70).nullish(),
	metaDescription: z.string().trim().max(160).nullish(),
	mediaIds: z.array(z.string()).default([]),
	options: z.array(optionInput).max(3, 'Three options is the practical limit').default([]),
	variants: z.array(variantInput).min(1, 'A product needs at least one variant')
}).superRefine((data, ctx) => {
	// A draft may be half-filled; a published product may not. A zero-price
	// variant on the storefront is an order someone can place for nothing.
	if (data.status !== 'active') return;
	for (const [i, v] of data.variants.entries()) {
		if (v.price <= 0) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ['variants', i, 'price'],
				message: v.key
					? `Set a price for ${v.key} before publishing`
					: 'Set a price before publishing'
			});
		}
	}
});

export type ProductForm = z.infer<typeof productForm>;
export type OptionInput = z.infer<typeof optionInput>;
export type VariantFormInput = z.infer<typeof variantInput>;

// ── checkout ────────────────────────────────────────────────────────────────

export * from './bd.ts';
export * from './blocks.ts';

// One page, four fields that matter.
export const checkoutForm = z.object({
	name: z.string().trim().min(2, 'Enter your name').max(80),
	phone: bdPhone,
	district: z.string().trim().min(1, 'Choose your district'),
	thana: z.string().trim().max(80).optional().default(''),
	area: z.string().trim().max(80).optional().default(''),
	detail: z.string().trim().min(5, 'House and road, so the courier can find you').max(300),
	note: z.string().trim().max(500).optional().default(''),
	paymentMethod: z.enum(['cod', 'bkash_manual']).default('cod'),
	/** Re-verified server-side; a code posted by the browser is only a claim. */
	couponCode: z.string().trim().max(40).optional().default('')
});

export type CheckoutForm = z.infer<typeof checkoutForm>;

export const trackForm = z.object({
	code: z.string().trim().min(4, 'Enter your order code').max(12),
	phone: bdPhone
});
export * from './countries.ts';

import { phoneFor, countryOf } from './countries.ts';

// The checkout form is per country: the phone rules and what the top-level
// address field is even called both change. `checkoutForm` stays as the
// Bangladesh shape so existing callers and types are untouched.
export const checkoutFormFor = (country: string | null | undefined) => {
	const profile = countryOf(country);
	return z.object({
		name: z.string().trim().min(2, 'Enter your name').max(80),
		phone: phoneFor(country),
		district: z.string().trim().min(1, `Choose your ${profile.areaLabel.toLowerCase()}`),
		thana: z.string().trim().max(80).optional().default(''),
		area: z.string().trim().max(80).optional().default(''),
		detail: z
			.string()
			.trim()
			.min(5, 'House and road, so the courier can find you')
			.max(300),
		note: z.string().trim().max(500).optional().default(''),
		paymentMethod: z.enum(['cod', 'bkash_manual']).default('cod'),
		couponCode: z.string().trim().max(40).optional().default('')
	});
};

export const trackFormFor = (country: string | null | undefined) =>
	z.object({
		code: z.string().trim().min(4, 'Enter your order code').max(12),
		phone: phoneFor(country)
	});
export * from './areas.ts';
