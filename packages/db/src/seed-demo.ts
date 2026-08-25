// Dev-only demo shop: a catalog with enough products that a grid looks like a grid, plus a
// composed home page.
import { readFileSync } from 'node:fs';
import {
	createCategory, createProduct, setOptions, replaceVariants, setProductImages, getProduct
} from '@fajr/core/catalog';
import { upload } from '@fajr/core/media';
import { createPage, updatePage, addBlock, updateBlock, setHome } from '@fajr/core/cms';
import { db, menuItem, newId, sql } from './index.ts';

const dir = process.argv[2];
if (!dir) throw new Error('usage: seed-demo <image-dir>');

// Dev-only, and destructive on purpose: running it twice must produce the same shop, not a
// second copy.
await db.write.execute(sql`
	delete from block;
	delete from page;
	delete from menu_item;
	delete from product_media;
	delete from product where id not in (select distinct product_id from order_item where product_id is not null);
	delete from category;
	delete from media where id not in (select media_id from product_media);
`);

const media = new Map<string, string>();
async function image(name: string, alt: string) {
	if (media.has(name)) return media.get(name)!;
	const result = await upload({
		bytes: new Uint8Array(readFileSync(`${dir}/${name}.png`)),
		mimeType: 'image/png',
		alt
	});
	if (!result.ok) throw new Error(`upload failed: ${name}`);
	media.set(name, result.item.id);
	return result.item.id;
}

// ── catalog ─────────────────────────────────────────────────────────────────

const CATEGORIES = [
	{ name: 'Sarees', tile: 'cat-sarees' },
	{ name: 'Kurti', tile: 'cat-kurti' },
	{ name: 'Shawls', tile: 'cat-shawls' },
	{ name: 'Panjabi', tile: 'cat-panjabi' }
];

const SIZES = ['S', 'M', 'L', 'XL'];

type Spec = {
	title: string;
	summary: string;
	category: string;
	priceMinor: number;
	compareAtMinor?: number;
	colours: { name: string; hex: string; image: string }[];
	stock: number[];
};

const PRODUCTS: Spec[] = [
	{
		title: 'লাল সিল্ক শাড়ি',
		summary: 'Handwoven Tangail silk with a zari border',
		category: 'Sarees',
		priceMinor: 420000,
		compareAtMinor: 520000,
		colours: [
			{ name: 'Crimson', hex: '#961e2a', image: 'saree-red' },
			{ name: 'Maroon', hex: '#5c1a1a', image: 'saree-maroon' }
		],
		stock: [6, 4, 3, 2]
	},
	{
		title: 'নীল জামদানি শাড়ি',
		summary: 'Traditional Jamdani motifs, half-silk',
		category: 'Sarees',
		priceMinor: 680000,
		compareAtMinor: 790000,
		colours: [{ name: 'Indigo', hex: '#2c3a6e', image: 'saree-indigo' }],
		stock: [3, 5, 2, 1]
	},
	{
		title: 'সবুজ কাতান শাড়ি',
		summary: 'Katan weave with contrast pallu',
		category: 'Sarees',
		priceMinor: 550000,
		colours: [{ name: 'Emerald', hex: '#185c4a', image: 'saree-emerald' }],
		stock: [4, 4, 4, 2]
	},
	{
		title: 'Mustard Cotton Kurti',
		summary: 'Block-printed cotton, everyday cut',
		category: 'Kurti',
		priceMinor: 165000,
		compareAtMinor: 210000,
		colours: [{ name: 'Mustard', hex: '#c69428', image: 'kurti-mustard' }],
		stock: [8, 10, 7, 4]
	},
	{
		title: 'Rose Embroidered Kurti',
		summary: 'Hand embroidery at the yoke',
		category: 'Kurti',
		priceMinor: 195000,
		colours: [{ name: 'Rose', hex: '#c4707a', image: 'kurti-rose' }],
		stock: [5, 6, 5, 3]
	},
	{
		title: 'Sand Linen Kurti',
		summary: 'Breathable linen for summer',
		category: 'Kurti',
		priceMinor: 180000,
		colours: [{ name: 'Sand', hex: '#cebA9c', image: 'kurti-sand' }],
		stock: [7, 9, 6, 0]
	},
	{
		title: 'Charcoal Everyday Kurti',
		summary: 'Goes with everything, washes well',
		category: 'Kurti',
		priceMinor: 155000,
		colours: [{ name: 'Charcoal', hex: '#484a52', image: 'kurti-charcoal' }],
		stock: [10, 12, 8, 5]
	},
	{
		title: 'Plum Wool Shawl',
		summary: 'Light wool, warm without weight',
		category: 'Shawls',
		priceMinor: 240000,
		compareAtMinor: 290000,
		colours: [{ name: 'Plum', hex: '#6c3460', image: 'shawl-plum' }],
		stock: [4, 4, 0, 0]
	},
	{
		title: 'Teal Handloom Shawl',
		summary: 'Handloom weave with fringed ends',
		category: 'Shawls',
		priceMinor: 225000,
		colours: [{ name: 'Teal', hex: '#226068', image: 'shawl-teal' }],
		stock: [3, 5, 2, 0]
	},
	{
		title: 'Cream Cotton Panjabi',
		summary: 'Soft cotton with a tonal collar',
		category: 'Panjabi',
		priceMinor: 235000,
		colours: [{ name: 'Cream', hex: '#ded2bc', image: 'panjabi-cream' }],
		stock: [6, 8, 6, 4]
	},
	{
		title: 'Navy Festive Panjabi',
		summary: 'Subtle chikan work, festival ready',
		category: 'Panjabi',
		priceMinor: 320000,
		compareAtMinor: 380000,
		colours: [{ name: 'Navy', hex: '#1e2c4e', image: 'panjabi-navy' }],
		stock: [5, 7, 5, 3]
	}
];

const categoryIds = new Map<string, string>();

for (const c of CATEGORIES) {
	const id = await createCategory({ name: c.name });
	categoryIds.set(c.name, id);
	await db.write.execute(
		sql`update category set image_media_id = ${await image(c.tile, c.name)} where id = ${id}`
	);
}

for (const spec of PRODUCTS) {
	const id = await createProduct({
		title: spec.title,
		summary: spec.summary,
		status: 'active',
		categoryId: categoryIds.get(spec.category)
	});

	await setOptions(id, [
		{ name: 'Colour', values: spec.colours.map((c) => ({ value: c.name, swatchHex: c.hex })) },
		{ name: 'Size', values: SIZES.map((s) => ({ value: s })) }
	]);

	const hydrated = (await getProduct(id))!;
	const byValue = new Map(hydrated.options.flatMap((o) => o.values.map((v) => [v.value, v.id] as const)));

	await replaceVariants(
		id,
		spec.colours.flatMap((colour, ci) =>
			SIZES.map((size, si) => ({
				priceMinor: spec.priceMinor + si * 5000,
				compareAtMinor: spec.compareAtMinor ? spec.compareAtMinor + si * 5000 : null,
				costMinor: Math.round(spec.priceMinor * 0.62),
				// Larger sizes sell out first, which is what a real grid looks like.
				stockOnHand: Math.max(0, spec.stock[si]! - ci),
				optionValueIds: [byValue.get(colour.name)!, byValue.get(size)!]
			}))
		)
	);

	await setProductImages(
		id,
		await Promise.all(spec.colours.map((c) => image(c.image, spec.title)))
	);
}

// ── navigation ──────────────────────────────────────────────────────────────

await db.write.execute(sql`delete from menu_item where menu = 'main'`);
for (const [i, c] of CATEGORIES.entries()) {
	await db.write.insert(menuItem).values({
		id: newId('mnu'),
		menu: 'main',
		label: c.name,
		href: `/c/${c.name.toLowerCase()}`,
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
	heading: 'Eid collection is here',
	subheading: 'Handwoven silk, Jamdani and everyday cotton — delivered nationwide.',
	mediaId: await image('hero-eid', 'Eid collection'),
	align: 'center',
	overlay: 40,
	cta: { label: 'Shop sarees', href: '/c/sarees' }
});

await block('usp-bar', {
	items: [
		{ title: 'Cash on delivery', body: 'All 64 districts' },
		{ title: 'Free delivery', body: 'On orders over ৳5,000' },
		{ title: 'Easy exchange', body: 'Within 7 days' },
		{ title: 'Real photos', body: 'What you see is what ships' }
	]
});

await block('category-tiles', {
	heading: 'Shop by category',
	slugs: CATEGORIES.map((c) => c.name.toLowerCase())
});

await block('product-grid', { heading: 'New arrivals', source: 'newest', limit: 8 });

await block('countdown', {
	heading: 'Eid offer ends in',
	endsAt: new Date(Date.now() + 6 * 86_400_000).toISOString(),
	subheading: 'Up to 20% off selected sarees'
});

await block('product-grid', {
	heading: 'Sarees',
	source: 'category',
	categorySlug: 'sarees',
	limit: 4
});

await block('testimonials', {
	heading: 'What customers say',
	items: [
		{ quote: 'The saree looked exactly like the photo. Delivery took two days to Chattogram.', name: 'Rina A.' },
		{ quote: 'Paid cash on delivery, no problem. The kurti fabric is genuinely soft.', name: 'Sadia H.' },
		{ quote: 'Called to confirm before shipping, which I appreciated.', name: 'Nusrat J.' }
	]
});

await block('faq', {
	heading: 'Before you order',
	items: [
		{ q: 'Do you deliver outside Dhaka?', a: 'Yes, to all 64 districts. Inside Dhaka is ৳60, outside is ৳120, and delivery is free over ৳5,000.' },
		{ q: 'Can I pay cash on delivery?', a: 'Yes. The delivery charge is paid in advance by bKash and the rest to the courier.' },
		{ q: 'What if it does not fit?', a: 'Exchange within 7 days, unworn and with the tag on.' }
	]
});

await block('cta-banner', {
	heading: 'Not sure about your size?',
	body: 'Message us on WhatsApp and we will help before you order.',
	cta: { label: 'Track an order', href: '/track' },
	tone: 'accent'
});

await updatePage(homeId, {
	status: 'published',
	metaTitle: 'Fajr Shop — handwoven sarees, kurti and panjabi',
	metaDescription: 'Handwoven silk, Jamdani and everyday cotton. Cash on delivery across Bangladesh.'
});
await setHome(homeId);

console.log(`demo shop ready: ${PRODUCTS.length} products, ${CATEGORIES.length} categories, home page composed`);
await db.close();
