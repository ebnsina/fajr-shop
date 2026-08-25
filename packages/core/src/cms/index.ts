import { db, page, block, banner, menuItem, newId, eq, and, or, sql, asc, desc, isNull, lte, gte } from '@fajr/db';
import { parseProps, defaultProps, isBlockType, type BlockType } from '@fajr/schemas';
import { newToken } from '../auth/token.ts';
import { uniqueSlug, slugify } from '../catalog/slug.ts';
import { publicUrl } from '../media/storage.ts';
import { audit } from '../audit/index.ts';

export type RenderedBlock = { id: string; type: BlockType; props: Record<string, unknown> };

export type RenderedPage = {
	id: string;
	slug: string;
	title: string;
	metaTitle: string | null;
	metaDescription: string | null;
	themeOverride: string | null;
	pixelId: string | null;
	blocks: RenderedBlock[];
};

const slugTaken = (slug: string, exceptId?: string) =>
	db.read
		.select({ id: page.id })
		.from(page)
		.where(eq(page.slug, slug))
		.limit(1)
		.then((rows) => rows.length > 0 && rows[0]!.id !== exceptId);

export async function createPage(input: { title: string; slug?: string }): Promise<string> {
	const id = newId('pg');
	await db.write.insert(page).values({
		id,
		title: input.title,
		slug: await uniqueSlug(input.slug ?? input.title, (s) => slugTaken(s), 'page'),
		previewToken: newToken()
	});
	await audit({ actorType: 'admin', action: 'page.create', entity: 'page', entityId: id });
	return id;
}

export async function updatePage(
	id: string,
	patch: {
		title?: string;
		slug?: string;
		status?: 'draft' | 'published';
		metaTitle?: string | null;
		metaDescription?: string | null;
		themeOverride?: string | null;
		pixelId?: string | null;
		unpublishAt?: Date | null;
	}
): Promise<void> {
	const current = await db.read.query.page.findFirst({ where: eq(page.id, id) });
	if (!current) throw new Error(`page ${id} not found`);

	const next: Record<string, unknown> = { updatedAt: new Date() };
	for (const key of ['title', 'metaTitle', 'metaDescription', 'themeOverride', 'pixelId', 'unpublishAt'] as const) {
		if (patch[key] !== undefined) next[key] = patch[key];
	}
	if (patch.slug !== undefined) {
		next.slug = await uniqueSlug(patch.slug, (s) => slugTaken(s, id), 'page');
	}
	if (patch.status !== undefined) {
		next.status = patch.status;
		if (patch.status === 'published' && !current.publishedAt) next.publishedAt = new Date();
	}

	await db.write.update(page).set(next).where(eq(page.id, id));
}

/** Exactly one page can be the home page. */
export async function setHome(id: string): Promise<void> {
	await db.write.transaction(async (tx) => {
		await tx.update(page).set({ isHome: false }).where(eq(page.isHome, true));
		await tx.update(page).set({ isHome: true, status: 'published', updatedAt: new Date() }).where(eq(page.id, id));
	});
}

// Every campaign starts as a copy of the last one that converted, so duplicate is a first-class
// action rather than a nice-to-have.
export async function duplicatePage(id: string): Promise<string> {
	const source = await db.read.query.page.findFirst({ where: eq(page.id, id) });
	if (!source) throw new Error(`page ${id} not found`);

	const blocks = await db.read.select().from(block).where(eq(block.pageId, id)).orderBy(asc(block.sort));
	const copyId = newId('pg');

	await db.write.transaction(async (tx) => {
		await tx.insert(page).values({
			id: copyId,
			title: `${source.title} copy`,
			slug: await uniqueSlug(`${source.slug}-copy`, (s) => slugTaken(s), 'page'),
			// A copy is always a draft: publishing it by accident is how a
			// half-edited campaign page ends up live.
			status: 'draft',
			metaTitle: source.metaTitle,
			metaDescription: source.metaDescription,
			themeOverride: source.themeOverride,
			pixelId: source.pixelId,
			previewToken: newToken()
		});

		for (const b of blocks) {
			await tx.insert(block).values({
				id: newId('blk'),
				pageId: copyId,
				type: b.type,
				props: b.props,
				sort: b.sort,
				isVisible: b.isVisible
			});
		}
	});

	return copyId;
}

export async function deletePage(id: string): Promise<void> {
	await db.write.delete(page).where(eq(page.id, id));
	await audit({ actorType: 'admin', action: 'page.delete', entity: 'page', entityId: id });
}

// ── blocks ──────────────────────────────────────────────────────────────────

export async function addBlock(pageId: string, type: string): Promise<string | null> {
	if (!isBlockType(type)) return null;

	const [last] = await db.read
		.select({ sort: block.sort })
		.from(block)
		.where(eq(block.pageId, pageId))
		.orderBy(desc(block.sort))
		.limit(1);

	const id = newId('blk');
	await db.write.insert(block).values({
		id,
		pageId,
		type,
		props: defaultProps(type),
		sort: (last?.sort ?? -1) + 1
	});
	return id;
}

/** Props are validated against the block's own schema before they are stored. */
export async function updateBlock(id: string, props: unknown): Promise<boolean> {
	const row = await db.read.query.block.findFirst({ where: eq(block.id, id) });
	if (!row) return false;

	const parsed = parseProps(row.type, props);
	if (!parsed) return false;

	await db.write.update(block).set({ props: parsed, updatedAt: new Date() }).where(eq(block.id, id));
	return true;
}

export async function setBlockVisible(id: string, isVisible: boolean): Promise<void> {
	await db.write.update(block).set({ isVisible, updatedAt: new Date() }).where(eq(block.id, id));
}

export const deleteBlock = (id: string) => db.write.delete(block).where(eq(block.id, id));

/** The whole new order in one call — the editor sends the list it is showing. */
export async function reorderBlocks(pageId: string, orderedIds: string[]): Promise<void> {
	await db.write.transaction(async (tx) => {
		for (const [i, id] of orderedIds.entries()) {
			await tx
				.update(block)
				.set({ sort: i, updatedAt: new Date() })
				.where(and(eq(block.id, id), eq(block.pageId, pageId)));
		}
	});
}

// ── reads ───────────────────────────────────────────────────────────────────

async function hydrate(row: typeof page.$inferSelect, includeHidden = false): Promise<RenderedPage> {
	const rows = await db.read
		.select()
		.from(block)
		.where(includeHidden ? eq(block.pageId, row.id) : and(eq(block.pageId, row.id), eq(block.isVisible, true)))
		.orderBy(asc(block.sort));

	return {
		id: row.id,
		slug: row.slug,
		title: row.title,
		metaTitle: row.metaTitle,
		metaDescription: row.metaDescription,
		themeOverride: row.themeOverride,
		pixelId: row.pixelId,
		blocks: rows
			.map((b) => {
				const props = parseProps(b.type, b.props);
				// A block type removed from the code must not 500 a live page.
				return props ? { id: b.id, type: b.type as BlockType, props } : null;
			})
			.filter((b): b is RenderedBlock => b !== null)
	};
}

/** Published, and inside its schedule. A draft resolves only with its token. */
const liveClause = and(
	eq(page.status, 'published'),
	or(isNull(page.unpublishAt), gte(page.unpublishAt, sql`now()`))
);

export async function livePage(slug: string, previewToken?: string | null): Promise<RenderedPage | null> {
	const row = await db.read.query.page.findFirst({ where: eq(page.slug, slug) });
	if (!row) return null;

	const scheduled = row.status === 'published' && (!row.unpublishAt || row.unpublishAt > new Date());
	const previewing = Boolean(previewToken) && previewToken === row.previewToken;
	if (!scheduled && !previewing) return null;

	return hydrate(row, previewing);
}

export async function homePage(): Promise<RenderedPage | null> {
	const row = await db.read.query.page.findFirst({ where: and(eq(page.isHome, true), liveClause) });
	return row ? hydrate(row) : null;
}

export async function editablePage(id: string) {
	const row = await db.read.query.page.findFirst({ where: eq(page.id, id) });
	if (!row) return null;
	const blocks = await db.read.select().from(block).where(eq(block.pageId, id)).orderBy(asc(block.sort));
	return { ...row, blocks };
}

export const listPages = () =>
	db.read
		.select({
			id: page.id,
			slug: page.slug,
			title: page.title,
			status: page.status,
			isHome: page.isHome,
			unpublishAt: page.unpublishAt,
			updatedAt: page.updatedAt,
			blockCount: sql<number>`(select count(*) from block where block.page_id = ${page.id})`
		})
		.from(page)
		.orderBy(desc(page.updatedAt));

/** Live banners for a slot, respecting the schedule. */
export async function bannersFor(slot: string) {
	const rows = await db.read
		.select()
		.from(banner)
		.where(
			and(
				eq(banner.slot, slot),
				eq(banner.isActive, true),
				or(isNull(banner.startsAt), lte(banner.startsAt, sql`now()`)),
				or(isNull(banner.endsAt), gte(banner.endsAt, sql`now()`))
			)
		)
		.orderBy(asc(banner.sort));

	return rows.map((b) => ({ ...b, url: null as string | null }));
}

export const menuFor = (menu = 'main') =>
	db.read
		.select()
		.from(menuItem)
		.where(and(eq(menuItem.menu, menu), eq(menuItem.isActive, true)))
		.orderBy(asc(menuItem.sort));

export { publicUrl, slugify };
