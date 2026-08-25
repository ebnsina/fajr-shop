import { db, attribute, productAttribute, category, product, newId, eq, and, sql, asc, inArray } from '@fajr/db';
import { slugify } from './slug.ts';
import { descendantIds } from './categories.ts';

export type AttributeDef = typeof attribute.$inferSelect;

export const attributesFor = (categoryId: string) =>
	db.read.select().from(attribute).where(eq(attribute.categoryId, categoryId)).orderBy(asc(attribute.sort));

export async function saveAttribute(input: {
	id?: string;
	categoryId: string;
	name: string;
	unit?: string | null;
	isFilterable?: boolean;
	sort?: number;
}): Promise<string> {
	const code = slugify(input.name) || 'attr';
	if (input.id) {
		await db.write
			.update(attribute)
			.set({
				name: input.name,
				unit: input.unit ?? null,
				isFilterable: input.isFilterable ?? true,
				sort: input.sort ?? 0,
				updatedAt: new Date()
			})
			.where(eq(attribute.id, input.id));
		return input.id;
	}

	const id = newId('atr');
	await db.write
		.insert(attribute)
		.values({
			id,
			categoryId: input.categoryId,
			name: input.name,
			code,
			unit: input.unit ?? null,
			isFilterable: input.isFilterable ?? true,
			sort: input.sort ?? 0
		})
		.onConflictDoNothing({ target: [attribute.categoryId, attribute.code] });
	return id;
}

export const deleteAttribute = (id: string) => db.write.delete(attribute).where(eq(attribute.id, id));

/** The whole set for one product, replaced wholesale — simpler than diffing. */
export async function setProductAttributes(
	productId: string,
	values: { attributeId: string; value: string }[]
): Promise<void> {
	await db.write.transaction(async (tx) => {
		await tx.delete(productAttribute).where(eq(productAttribute.productId, productId));
		for (const v of values) {
			if (!v.value.trim()) continue; // an empty spec row is not a spec
			await tx.insert(productAttribute).values({
				productId,
				attributeId: v.attributeId,
				value: v.value.trim()
			});
		}
	});
}

export type SpecRow = { name: string; unit: string | null; value: string };

/** The spec table on a tech PDP: the attributes this product actually has. */
export async function specsFor(productId: string): Promise<SpecRow[]> {
	const rows = await db.read
		.select({
			name: attribute.name,
			unit: attribute.unit,
			value: productAttribute.value,
			sort: attribute.sort
		})
		.from(productAttribute)
		.innerJoin(attribute, eq(attribute.id, productAttribute.attributeId))
		.where(eq(productAttribute.productId, productId))
		.orderBy(asc(attribute.sort));

	return rows.map((r) => ({ name: r.name, unit: r.unit, value: r.value }));
}

export type Facet = {
	attributeId: string;
	name: string;
	unit: string | null;
	values: { value: string; count: number }[];
};

// Facets for a category listing, counted from the products actually in it.
export async function facetsFor(categoryId: string): Promise<Facet[]> {
	const categoryIds = await descendantIds(categoryId);
	if (!categoryIds.length) return [];

	const rows = (await db.read.execute(sql`
		select a.id, a.name, a.unit, a.sort, pa.value, count(*)::int as n
		from product_attribute pa
		join attribute a on a.id = pa.attribute_id
		join product p on p.id = pa.product_id
		where a.is_filterable
		  and p.status = 'active'
		  and p.category_id in ${sql`(${sql.join(categoryIds.map((i) => sql`${i}`), sql`, `)})`}
		group by a.id, a.name, a.unit, a.sort, pa.value
		order by a.sort, count(*) desc
	`)) as unknown as { id: string; name: string; unit: string | null; value: string; n: number }[];

	const byAttribute = new Map<string, Facet>();
	for (const r of rows) {
		if (!byAttribute.has(r.id)) {
			byAttribute.set(r.id, { attributeId: r.id, name: r.name, unit: r.unit, values: [] });
		}
		byAttribute.get(r.id)!.values.push({ value: r.value, count: Number(r.n) });
	}
	return [...byAttribute.values()];
}

/** Product ids matching every selected facet — AND across attributes, OR within one. */
export async function filterByFacets(
	categoryIds: string[],
	selected: Record<string, string[]>
): Promise<string[] | null> {
	const entries = Object.entries(selected).filter(([, values]) => values.length > 0);
	if (entries.length === 0) return null; // no filter, no restriction

	const clauses = entries.map(
		([attributeId, values]) => sql`
			exists (
				select 1 from product_attribute pa
				where pa.product_id = p.id
				  and pa.attribute_id = ${attributeId}
				  and pa.value in ${sql`(${sql.join(values.map((v) => sql`${v}`), sql`, `)})`}
			)`
	);

	const rows = (await db.read.execute(sql`
		select p.id from product p
		where p.status = 'active'
		  and p.category_id in ${sql`(${sql.join(categoryIds.map((i) => sql`${i}`), sql`, `)})`}
		  and ${sql.join(clauses, sql` and `)}
	`)) as unknown as { id: string }[];

	return rows.map((r) => r.id);
}
