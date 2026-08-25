import { db, integration, eq, and, sql } from '@fajr/db';
import { audit } from '../audit/index.ts';
import { CATALOG, listingFor, type Kind, type Listing } from './catalog.ts';

export * from './catalog.ts';

export type Installed = {
	slug: string;
	kind: Kind;
	enabled: boolean;
	// Secrets come back masked. The real value never leaves the server.
	config: Record<string, string>;
	lastCheckedAt: Date | null;
	lastError: string | null;
};

export type Entry = Listing & {
	installed: boolean;
	enabled: boolean;
	config: Record<string, string>;
	lastError: string | null;
};

const MASK = '••••••••';

// Masked for display; the raw value stays in the database. A merchant should be
// able to see that a key is set without the browser ever holding it.
function mask(listing: Listing, config: Record<string, string>): Record<string, string> {
	const out: Record<string, string> = {};
	for (const field of listing.fields) {
		const value = config[field.key];
		if (value === undefined || value === '') continue;
		out[field.key] = field.secret ? MASK : value;
	}
	return out;
}

// The catalogue joined with what is installed, in one query.
export async function listIntegrations(region?: 'south-asia' | 'middle-east'): Promise<Entry[]> {
	const rows = await db.read.select().from(integration);
	const byId = new Map(rows.map((r) => [r.id, r]));

	return CATALOG.filter((c) => !region || c.regions.includes(region)).map((listing) => {
		const row = byId.get(listing.slug);
		return {
			...listing,
			installed: Boolean(row),
			enabled: row?.enabled ?? false,
			config: row ? mask(listing, row.config) : {},
			lastError: row?.lastError ?? null
		};
	});
}

export type SaveResult = { ok: true } | { ok: false; missing: string[] };

// Install or reconfigure. A blank secret means "leave the stored one alone",
// so a merchant editing one field does not wipe the rest.
export async function saveIntegration(
	slug: string,
	input: Record<string, string>,
	ctx: { actorId?: string | null } = {}
): Promise<SaveResult> {
	const listing = listingFor(slug);
	if (!listing) return { ok: false, missing: ['unknown integration'] };

	const existing = await db.read.query.integration.findFirst({ where: eq(integration.id, slug) });
	const config: Record<string, string> = { ...(existing?.config ?? {}) };

	for (const field of listing.fields) {
		const value = (input[field.key] ?? '').trim();
		if (field.secret && (value === '' || value === MASK)) continue;
		if (value === '') delete config[field.key];
		else config[field.key] = value;
	}

	const missing = listing.fields
		.filter((f) => !f.optional && !config[f.key])
		.map((f) => f.label);
	if (missing.length) return { ok: false, missing };

	await db.write
		.insert(integration)
		.values({ id: slug, kind: listing.kind, config, enabled: true })
		.onConflictDoUpdate({
			target: integration.id,
			set: { config, enabled: true, lastError: null, updatedAt: sql`now()` }
		});

	await audit({
		actorType: 'admin',
		actorId: ctx.actorId ?? null,
		action: existing ? 'integration.update' : 'integration.install',
		entity: 'integration',
		entityId: slug
	});
	return { ok: true };
}

// Disabling keeps the credentials, so pausing a courier for a week is not a
// retyping exercise.
export async function setEnabled(slug: string, enabled: boolean, ctx: { actorId?: string | null } = {}) {
	await db.write
		.update(integration)
		.set({ enabled, updatedAt: sql`now()` })
		.where(eq(integration.id, slug));
	await audit({
		actorType: 'admin',
		actorId: ctx.actorId ?? null,
		action: enabled ? 'integration.enable' : 'integration.disable',
		entity: 'integration',
		entityId: slug
	});
}

export async function uninstall(slug: string, ctx: { actorId?: string | null } = {}) {
	await db.write.delete(integration).where(eq(integration.id, slug));
	await audit({
		actorType: 'admin',
		actorId: ctx.actorId ?? null,
		action: 'integration.uninstall',
		entity: 'integration',
		entityId: slug
	});
}

// What an adapter calls. Returns null when the integration is absent or
// switched off, so callers fall back rather than half-work with no credentials.
export async function configFor(slug: string): Promise<Record<string, string> | null> {
	const row = await db.read.query.integration.findFirst({
		where: and(eq(integration.id, slug), eq(integration.enabled, true))
	});
	return row?.config ?? null;
}

export async function enabledOf(kind: Kind): Promise<Installed[]> {
	const rows = await db.read
		.select()
		.from(integration)
		.where(and(eq(integration.kind, kind), eq(integration.enabled, true)));

	return rows.map((r) => ({
		slug: r.id,
		kind: r.kind,
		enabled: r.enabled,
		config: r.config,
		lastCheckedAt: r.lastCheckedAt,
		lastError: r.lastError
	}));
}

export async function recordCheck(slug: string, error: string | null) {
	await db.write
		.update(integration)
		.set({ lastCheckedAt: sql`now()`, lastError: error, updatedAt: sql`now()` })
		.where(eq(integration.id, slug));
}
