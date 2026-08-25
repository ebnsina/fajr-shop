import { db, category, product, newId, eq, and, sql, asc, isNull, inArray } from '@fajr/db';
import { slugify, uniqueSlug } from './slug.ts';
import { audit } from '../audit/index.ts';

export type CategoryNode = {
	id: string;
	parentId: string | null;
	name: string;
	slug: string;
	path: string;
	depth: number;
	sort: number;
	isActive: boolean;
	children: CategoryNode[];
};

const slugTaken = (slug: string, exceptId?: string) =>
	db.read
		.select({ id: category.id })
		.from(category)
		.where(eq(category.slug, slug))
		.limit(1)
		.then((rows) => rows.length > 0 && rows[0]!.id !== exceptId);

/** '/a/b/c/' — leading and trailing slashes make LIKE prefixes unambiguous. */
const buildPath = (parentPath: string | null, id: string) => `${parentPath ?? '/'}${id}/`;

export async function createCategory(input: {
	name: string;
	parentId?: string | null;
	slug?: string;
	description?: string | null;
	sort?: number;
}): Promise<string> {
	const id = newId('cat');
	let parentPath: string | null = null;
	let depth = 0;

	if (input.parentId) {
		const parent = await db.read.query.category.findFirst({ where: eq(category.id, input.parentId) });
		if (!parent) throw new Error(`parent category ${input.parentId} not found`);
		parentPath = parent.path;
		depth = parent.depth + 1;
	}

	await db.write.insert(category).values({
		id,
		parentId: input.parentId ?? null,
		path: buildPath(parentPath, id),
		depth,
		name: input.name,
		slug: await uniqueSlug(input.slug ?? input.name, (s) => slugTaken(s), 'category'),
		description: input.description ?? null,
		sort: input.sort ?? 0
	});

	await audit({ actorType: 'admin', action: 'category.create', entity: 'category', entityId: id });
	return id;
}

export async function updateCategory(
	id: string,
	patch: { name?: string; slug?: string; description?: string | null; sort?: number; isActive?: boolean }
): Promise<void> {
	const next: Record<string, unknown> = { updatedAt: new Date() };
	if (patch.name !== undefined) next.name = patch.name;
	if (patch.description !== undefined) next.description = patch.description;
	if (patch.sort !== undefined) next.sort = patch.sort;
	if (patch.isActive !== undefined) next.isActive = patch.isActive;
	if (patch.slug !== undefined) {
		next.slug = await uniqueSlug(patch.slug, (s) => slugTaken(s, id), 'category');
	}
	await db.write.update(category).set(next).where(eq(category.id, id));
}

// Moving a subtree is one UPDATE: every descendant's path shares the old prefix, so replacing
// that prefix moves the whole branch.
export async function moveCategory(id: string, newParentId: string | null): Promise<void> {
	const node = await db.read.query.category.findFirst({ where: eq(category.id, id) });
	if (!node) throw new Error(`category ${id} not found`);

	let parentPath: string | null = null;
	let parentDepth = -1;

	if (newParentId) {
		const parent = await db.read.query.category.findFirst({ where: eq(category.id, newParentId) });
		if (!parent) throw new Error(`parent category ${newParentId} not found`);
		// A node cannot move inside its own subtree, or the tree becomes a ring.
		if (parent.path.startsWith(node.path)) throw new Error('cannot move a category into its own descendant');
		parentPath = parent.path;
		parentDepth = parent.depth;
	}

	const oldPath = node.path;
	const newPath = buildPath(parentPath, id);
	const depthShift = parentDepth + 1 - node.depth;

	await db.write.transaction(async (tx) => {
		await tx
			.update(category)
			.set({
				// The ::int cast is load-bearing.
				path: sql`${newPath} || substring(${category.path} from ${oldPath.length + 1}::int)`,
				depth: sql`${category.depth} + ${depthShift}`,
				updatedAt: new Date()
			})
			.where(sql`${category.path} like ${oldPath + '%'}`);

		await tx.update(category).set({ parentId: newParentId }).where(eq(category.id, id));
	});

	await audit({ actorType: 'admin', action: 'category.move', entity: 'category', entityId: id, meta: { newParentId } });
}

/** Every ancestor of a category, root first — the breadcrumb, in one query. */
export async function ancestorsOf(id: string) {
	const node = await db.read.query.category.findFirst({ where: eq(category.id, id) });
	if (!node) return [];
	const ids = node.path.split('/').filter(Boolean).slice(0, -1);
	if (!ids.length) return [];
	const rows = await db.read.select().from(category).where(inArray(category.id, ids));
	return ids.map((i) => rows.find((r) => r.id === i)!).filter(Boolean);
}

/** Every product in a category *or any category beneath it*, via a LIKE prefix. */
export async function descendantIds(id: string): Promise<string[]> {
	const node = await db.read.query.category.findFirst({ where: eq(category.id, id) });
	if (!node) return [];
	const rows = await db.read
		.select({ id: category.id })
		.from(category)
		.where(sql`${category.path} like ${node.path + '%'}`);
	return rows.map((r) => r.id);
}

export async function categoryTree(opts: { activeOnly?: boolean } = {}): Promise<CategoryNode[]> {
	const rows = await db.read
		.select()
		.from(category)
		.where(opts.activeOnly ? eq(category.isActive, true) : undefined)
		.orderBy(asc(category.depth), asc(category.sort), asc(category.name));

	const byId = new Map<string, CategoryNode>();
	const roots: CategoryNode[] = [];

	for (const row of rows) {
		byId.set(row.id, { ...row, children: [] } as CategoryNode);
	}
	for (const row of rows) {
		const node = byId.get(row.id)!;
		const parent = row.parentId ? byId.get(row.parentId) : undefined;
		if (parent) parent.children.push(node);
		else roots.push(node);
	}
	return roots;
}

export const getCategoryBySlug = (slug: string) =>
	db.read.query.category.findFirst({ where: eq(category.slug, slug) });

// Deleting a category orphans its products rather than deleting them — losing a category must
// never lose a catalog. Children move up to the grandparent.
export async function deleteCategory(id: string): Promise<void> {
	const node = await db.read.query.category.findFirst({ where: eq(category.id, id) });
	if (!node) return;

	const children = await db.read.select({ id: category.id }).from(category).where(eq(category.parentId, id));
	for (const child of children) await moveCategory(child.id, node.parentId);

	await db.write.update(product).set({ categoryId: null }).where(eq(product.categoryId, id));
	await db.write.delete(category).where(eq(category.id, id));
	await audit({ actorType: 'admin', action: 'category.delete', entity: 'category', entityId: id });
}

export const rootCategories = () =>
	db.read.select().from(category).where(and(isNull(category.parentId), eq(category.isActive, true))).orderBy(asc(category.sort));
