import { db, setting, shippingZone, newId, eq, asc } from '@fajr/db';
import { audit } from '../audit/index.ts';

export type StoreSettings = typeof setting.$inferSelect;

/** Exactly one row. Not multi-tenant: this is the whole per-merchant surface. */
export async function getSettings(): Promise<StoreSettings> {
	const row = await db.read.query.setting.findFirst({ where: eq(setting.id, 'default') });
	if (row) return row;

	// A deploy that has never been configured still needs a settings row.
	const [created] = await db.write
		.insert(setting)
		.values({ id: 'default' })
		.onConflictDoNothing()
		.returning();
	return created ?? (await db.read.query.setting.findFirst({ where: eq(setting.id, 'default') }))!;
}

export type SettingsPatch = Partial<
	Pick<
		StoreSettings,
		| 'storeName' | 'logoMediaId' | 'currency' | 'country' | 'defaultLocale' | 'timezone'
		| 'supportPhone' | 'supportEmail' | 'supportHours' | 'tagline' | 'announcement'
		| 'vatRegistered' | 'vatBin' | 'vatRateBp'
		| 'vatInclusivePricing' | 'theme' | 'setupStep'
	>
>;

export async function updateSettings(patch: SettingsPatch): Promise<void> {
	await getSettings();
	await db.write
		.update(setting)
		.set({ ...patch, updatedAt: new Date() })
		.where(eq(setting.id, 'default'));

	await audit({
		actorType: 'admin',
		action: 'settings.update',
		entity: 'setting',
		entityId: 'default',
		meta: { changed: Object.keys(patch) }
	});
}

// ── shipping zones ──────────────────────────────────────────────────────────

export const listZones = () =>
	db.read.select().from(shippingZone).orderBy(asc(shippingZone.sort));

export type ZoneInput = {
	name: string;
	districts: string[];
	chargeMinor: number;
	advanceMinor: number;
	freeOverMinor: number | null;
	sort: number;
	isActive: boolean;
};

export async function saveZone(id: string | null, input: ZoneInput): Promise<void> {
	if (id) {
		await db.write.update(shippingZone).set({ ...input, updatedAt: new Date() }).where(eq(shippingZone.id, id));
	} else {
		await db.write.insert(shippingZone).values({ id: newId('zone'), ...input });
	}
}

export const deleteZone = (id: string) => db.write.delete(shippingZone).where(eq(shippingZone.id, id));

// The wizard is a saved position, not a separate system: every field it collects is editable in
// settings afterwards.
export const SETUP_STEPS = ['store', 'theme', 'catalog', 'delivery', 'payments', 'staff'] as const;
export type SetupStep = (typeof SETUP_STEPS)[number];

export async function advanceSetup(current: SetupStep): Promise<SetupStep | null> {
	const next = SETUP_STEPS[SETUP_STEPS.indexOf(current) + 1] ?? null;
	await updateSettings({ setupStep: next });
	return next;
}

export const finishSetup = () => updateSettings({ setupStep: null });
