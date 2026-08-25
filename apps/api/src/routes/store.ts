import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { getSettings, listZones } from '@fajr/core/settings';
import { navCategories } from '@fajr/core/catalog';
import { countryOf, areasOf, subAreasOf } from '@fajr/schemas';
import type { Env } from '../app.ts';

const json = (schema: z.ZodTypeAny, description: string) => ({
	description,
	content: { 'application/json': { schema } }
});

export const storeRoutes = new OpenAPIHono<Env>();

// Everything a client needs before it can render anything: who the shop is,
// what currency it takes, and what an address looks like here.
storeRoutes.openapi(
	createRoute({
		method: 'get',
		path: '/api/v1/store',
		summary: 'Shop settings, address shape and navigation',
		tags: ['store'],
		responses: {
			200: json(
				z.object({
					name: z.string(),
					currency: z.string(),
					country: z.string(),
					locale: z.string(),
					numberLocale: z.string(),
					tagline: z.string().nullable(),
					announcement: z.string().nullable(),
					supportPhone: z.string().nullable(),
					supportHours: z.string().nullable(),
					theme: z.string(),
					taxInclusive: z.boolean(),
					taxRateBp: z.number(),
					address: z.object({
						areaLabel: z.string(),
						subAreaLabel: z.string().nullable(),
						areas: z.array(z.string()),
						phoneExample: z.string()
					}),
					categories: z.array(
						z.object({ id: z.string(), name: z.string(), slug: z.string() })
					)
				}),
				'Shop configuration'
			)
		}
	}),
	async (c) => {
		const [settings, categories] = await Promise.all([getSettings(), navCategories()]);
		const profile = countryOf(settings.country);

		return c.json({
			name: settings.storeName,
			currency: settings.currency,
			country: settings.country,
			locale: settings.defaultLocale,
			numberLocale: `${settings.defaultLocale}-${settings.country}`,
			tagline: settings.tagline,
			announcement: settings.announcement,
			supportPhone: settings.supportPhone,
			supportHours: settings.supportHours,
			theme: settings.theme,
			taxInclusive: settings.vatInclusivePricing,
			taxRateBp: settings.vatRateBp,
			address: {
				areaLabel: profile.areaLabel,
				subAreaLabel: profile.subAreaLabel,
				areas: areasOf(settings.country),
				phoneExample: profile.phoneExample
			},
			categories: categories.map((cat) => ({ id: cat.id, name: cat.name, slug: cat.slug }))
		});
	}
);

// The second field of the address, for whichever first-level area was picked.
storeRoutes.openapi(
	createRoute({
		method: 'get',
		path: '/api/v1/store/areas/{area}',
		summary: 'Delivery sub-areas for one area',
		tags: ['store'],
		request: { params: z.object({ area: z.string() }) },
		responses: { 200: json(z.object({ subAreas: z.array(z.string()) }), 'Sub-areas') }
	}),
	async (c) => {
		const settings = await getSettings();
		return c.json({ subAreas: subAreasOf(settings.country, c.req.valid('param').area) });
	}
);

storeRoutes.openapi(
	createRoute({
		method: 'get',
		path: '/api/v1/store/delivery',
		summary: 'Delivery zones and charges',
		tags: ['store'],
		responses: {
			200: json(
				z.object({
					zones: z.array(
						z.object({
							name: z.string(),
							areas: z.array(z.string()),
							chargeMinor: z.number(),
							advanceMinor: z.number(),
							freeOverMinor: z.number().nullable()
						})
					)
				}),
				'Zones in match order'
			)
		}
	}),
	async (c) => {
		const zones = await listZones();
		return c.json({
			zones: zones
				.filter((z) => z.isActive)
				.map((z) => ({
					name: z.name,
					areas: z.districts,
					chargeMinor: z.chargeMinor,
					advanceMinor: z.advanceMinor,
					freeOverMinor: z.freeOverMinor
				}))
		});
	}
);
