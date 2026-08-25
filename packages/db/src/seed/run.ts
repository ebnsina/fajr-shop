// Seeds one demo vertical end to end: catalogue, images, menu and home page.
//   pnpm db:seed:vertical <fashion|kids|grocery|tech|beauty|home>
import {
	createCategory, createProduct, setOptions, replaceVariants, setProductImages,
	getProduct, saveAttribute, setProductAttributes
} from '@fajr/core/catalog';
import { upload } from '@fajr/core/media';
import { createPage, updatePage, addBlock, updateBlock, setHome } from '@fajr/core/cms';
import { updateSettings } from '@fajr/core/settings';
import { db, menuItem, newId, sql } from '../index.ts';
import { tile } from './png.ts';
import type { P, Vertical } from './types.ts';
import { fashion } from './fashion.ts';
import { kids } from './kids.ts';
import { grocery } from './grocery.ts';
import { tech } from './tech.ts';
import { beauty } from './beauty.ts';
import { home } from './home.ts';

const ALL: Record<string, Vertical> = { fashion, kids, grocery, tech, beauty, home };

// A dense grid with specs up front suits groceries and electronics; the roomy
// image-led grid suits everything else.
const THEME: Record<string, 'fashion' | 'tech'> = {
	fashion: 'fashion', kids: 'fashion', beauty: 'fashion',
	home: 'fashion', grocery: 'tech', tech: 'tech'
};

const key = process.argv[2];
const v = key ? ALL[key] : undefined;
if (!v) {
	console.error(`usage: seed:vertical <${Object.keys(ALL).join('|')}>`);
	process.exit(1);
}

// Destructive on purpose: seeding twice must produce one shop, not two.
// Orders survive, so reports and CRM still have something to show.
await db.write.execute(sql`
	delete from block;
	delete from page;
	delete from menu_item;
	delete from product_attribute;
	delete from attribute;
	delete from product_media;
	delete from product where id not in (select distinct product_id from order_item where product_id is not null);
	delete from category;
	delete from media where id not in (select media_id from product_media);
`);

const cache = new Map<string, string>();
async function image(name: string, alt: string) {
	const hit = cache.get(name);
	if (hit) return hit;
	const result = await upload({ bytes: tile(name), mimeType: 'image/png', alt });
	if (!result.ok) throw new Error(`upload failed for ${name}: ${result.reason}`);
	cache.set(name, result.item.id);
	return result.item.id;
}

// ── categories ──────────────────────────────────────────────────────────────

const categoryIds = new Map<string, string>();
const slugs = new Map<string, string>();
for (const [i, name] of v.categories.entries()) {
	const id = await createCategory({ name, sort: i });
	categoryIds.set(name, id);
	await db.write.execute(
		sql`update category set image_media_id = ${await image(`cat-${name}`, name)} where id = ${id}`
	);
	// Read the slug back: createCategory de-duplicates, so recomputing it can
	// produce a link to a category that does not exist.
	const row = await db.read.query.category.findFirst({
		columns: { slug: true },
		where: (c, { eq }) => eq(c.id, id)
	});
	slugs.set(name, row!.slug);
}

// ── attributes, one set per category that declares any ──────────────────────

const attributeIds = new Map<string, string>(); // "category::name" -> id
for (const name of v.categories) {
	const specced = v.products.filter((p) => p.c === name && p.spec);
	const names = [...new Set(specced.flatMap((p) => Object.keys(p.spec!)))];
	for (const [i, attr] of names.entries()) {
		const id = await saveAttribute({
			categoryId: categoryIds.get(name)!,
			name: attr,
			unit: v.units?.[attr] ?? null,
			sort: i
		});
		attributeIds.set(`${name}::${attr}`, id);
	}
}

// ── products ────────────────────────────────────────────────────────────────

const taka = (n: number) => Math.round(n * 100);

async function seedProduct(spec: P) {
	const id = await createProduct({
		title: spec.t,
		summary: spec.spec
			? Object.entries(spec.spec).map(([k, val]) => `${k}: ${val}`).join(' · ')
			: undefined,
		status: 'active',
		categoryId: categoryIds.get(spec.c)
	});

	if (spec.opt) {
		const [axis, values] = spec.opt;
		await setOptions(id, [
			{
				name: axis,
				values: values.map((val, i) => ({ value: val, swatchHex: spec.sw?.[i] }))
			}
		]);

		const hydrated = (await getProduct(id))!;
		const byValue = new Map(
			hydrated.options.flatMap((o) => o.values.map((val) => [val.value, val.id] as const))
		);

		await replaceVariants(
			id,
			values.map((val, i) => ({
				// Larger packs and bigger sizes cost more, which is what a real grid looks like.
				priceMinor: taka(spec.p) + i * Math.round(taka(spec.p) * 0.12),
				compareAtMinor: spec.was ? taka(spec.was) + i * Math.round(taka(spec.was) * 0.12) : null,
				costMinor: Math.round(taka(spec.p) * 0.68),
				// Some variants sell out, so the storefront has to render that state.
				stockOnHand: Math.max(0, (spec.s ?? 10) - i * 2),
				optionValueIds: [byValue.get(val)!]
			}))
		);
	} else {
		await replaceVariants(id, [
			{
				priceMinor: taka(spec.p),
				compareAtMinor: spec.was ? taka(spec.was) : null,
				costMinor: Math.round(taka(spec.p) * 0.68),
				stockOnHand: spec.s ?? 10
			}
		]);
	}

	if (spec.spec) {
		await setProductAttributes(
			id,
			Object.entries(spec.spec).map(([attr, val]) => ({
				attributeId: attributeIds.get(`${spec.c}::${attr}`)!,
				value: val
			}))
		);
	}

	await setProductImages(id, [await image(spec.t, spec.t)]);
}

for (const spec of v.products) await seedProduct(spec);

// ── navigation ──────────────────────────────────────────────────────────────

for (const [i, name] of v.categories.entries()) {
	await db.write.insert(menuItem).values({
		id: newId('mnu'),
		menu: 'main',
		label: name,
		href: `/c/${slugs.get(name)!}`,
		sort: i
	});
}

// ── home page ───────────────────────────────────────────────────────────────

const homeId = await createPage({ title: 'Home', slug: 'home' });

async function block(type: string, props: Record<string, unknown>) {
	const id = await addBlock(homeId, type);
	if (id) await updateBlock(id, props);
}

await block('hero', {
	heading: v.hero.heading,
	subheading: v.hero.subheading,
	mediaId: await image(`hero-${v.key}`, v.hero.heading),
	align: 'center',
	overlay: 40,
	cta: { label: v.hero.cta, href: `/c/${slugs.get(v.categories[0]!)!}` }
});
await block('usp-bar', { items: v.usps });
await block('category-tiles', {
	heading: 'Shop by category',
	slugs: v.categories.map((c) => slugs.get(c)!)
});
await block('product-grid', { heading: 'New arrivals', source: 'newest', limit: 8 });
await block('countdown', {
	heading: v.promo.heading,
	subheading: v.promo.subheading,
	endsAt: new Date(Date.now() + 6 * 86_400_000).toISOString()
});
await block('product-grid', {
	heading: v.categories[1]!,
	source: 'category',
	categorySlug: slugs.get(v.categories[1]!)!,
	limit: 4
});
await block('testimonials', { heading: 'What customers say', items: v.quotes });
await block('faq', { heading: 'Before you order', items: v.faq });
await block('cta-banner', {
	heading: 'Need help choosing?',
	body: 'Message us on WhatsApp and we will answer before you order.',
	cta: { label: 'Track an order', href: '/track' },
	tone: 'accent'
});

await updatePage(homeId, {
	status: 'published',
	metaTitle: v.meta.title,
	metaDescription: v.meta.description
});
await setHome(homeId);

await updateSettings({
	storeName: v.shop,
	theme: THEME[v.key]!,
	// Doubles as the og:image, so a shared link is never a blank card.
	logoMediaId: await image(`logo-${v.key}`, v.shop),
	tagline: v.meta.description,
	announcement: v.announcement,
	supportHours: v.supportHours
});

const variants = v.products.reduce((n, p) => n + (p.opt?.[1].length ?? 1), 0);
console.log(
	`${v.key}: ${v.products.length} products, ${variants} variants, ` +
		`${v.categories.length} categories, ${cache.size} images, home composed`
);
await db.close();
