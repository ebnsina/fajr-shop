import type { Vertical } from './types.ts';

const SHADE: [string, string[]] = ['Shade', ['Fair', 'Light', 'Medium', 'Warm', 'Deep']];

export const beauty: Vertical = {
	key: 'beauty',
	shop: 'Rupkotha',
	categories: ['Skincare', 'Makeup', 'Haircare', 'Fragrance', 'Bath & Body', 'Tools & Brushes'],
	products: [
		{ t: 'Vitamin C Face Serum 30ml', c: 'Skincare', p: 1450, was: 1750, spec: { Concern: 'Brightening', Skin: 'All' }, s: 34 },
		{ t: 'Niacinamide 10% Serum', c: 'Skincare', p: 1250, spec: { Concern: 'Acne', Skin: 'Oily' }, s: 42 },
		{ t: 'Hyaluronic Acid Serum', c: 'Skincare', p: 1350, spec: { Concern: 'Hydration', Skin: 'Dry' }, s: 38 },
		{ t: 'Gel Face Wash 100ml', c: 'Skincare', p: 550, was: 650, spec: { Concern: 'Cleansing', Skin: 'Oily' }, s: 60 },
		{ t: 'Foaming Cleanser 150ml', c: 'Skincare', p: 680, spec: { Concern: 'Cleansing', Skin: 'Combination' }, s: 48 },
		{ t: 'Sunscreen SPF 50 PA+++', c: 'Skincare', p: 950, was: 1150, spec: { Concern: 'Sun Protection', Skin: 'All' }, s: 72 },
		{ t: 'Oil Free Moisturiser', c: 'Skincare', p: 780, spec: { Concern: 'Hydration', Skin: 'Oily' }, s: 45 },
		{ t: 'Night Repair Cream', c: 'Skincare', p: 1650, spec: { Concern: 'Anti Ageing', Skin: 'Dry' }, s: 26 },
		{ t: 'Clay Face Mask 100g', c: 'Skincare', p: 620, spec: { Concern: 'Acne', Skin: 'Oily' }, s: 40 },
		{ t: 'Sheet Mask Pack of 5', c: 'Skincare', p: 450, was: 550, spec: { Concern: 'Hydration', Skin: 'All' }, s: 88 },
		{ t: 'Under Eye Gel 15ml', c: 'Skincare', p: 890, spec: { Concern: 'Dark Circles', Skin: 'All' }, s: 32 },
		{ t: 'Micellar Water 250ml', c: 'Skincare', p: 720, spec: { Concern: 'Cleansing', Skin: 'Sensitive' }, s: 50 },

		{ t: 'Matte Liquid Lipstick', c: 'Makeup', p: 650, was: 800, opt: ['Shade', ['Nude', 'Rose', 'Brick', 'Berry', 'Red']], sw: ['#c69a86', '#c4707a', '#a5452f', '#7e2b4c', '#a52a34'], s: 56 },
		{ t: 'Liquid Foundation 30ml', c: 'Makeup', p: 1250, opt: SHADE, s: 34 },
		{ t: 'Compact Powder', c: 'Makeup', p: 780, opt: SHADE, s: 42 },
		{ t: 'Concealer Stick', c: 'Makeup', p: 690, opt: SHADE, s: 38 },
		{ t: 'Kajal Waterproof', c: 'Makeup', p: 320, s: 95 },
		{ t: 'Liquid Eyeliner', c: 'Makeup', p: 450, was: 550, s: 68 },
		{ t: 'Volumising Mascara', c: 'Makeup', p: 850, s: 40 },
		{ t: 'Eyeshadow Palette 12 Shades', c: 'Makeup', p: 1450, was: 1750, s: 22 },
		{ t: 'Blush Compact', c: 'Makeup', p: 620, opt: ['Shade', ['Peach', 'Rose', 'Coral']], sw: ['#e8a887', '#c4707a', '#e07a5f'], s: 36 },
		{ t: 'Highlighter Palette', c: 'Makeup', p: 980, s: 24 },
		{ t: 'Lip Balm Tinted', c: 'Makeup', p: 280, s: 110 },
		{ t: 'Makeup Setting Spray', c: 'Makeup', p: 890, s: 30 },

		{ t: 'Anti Hairfall Shampoo 340ml', c: 'Haircare', p: 620, was: 720, spec: { Concern: 'Hairfall', Type: 'All' }, s: 74 },
		{ t: 'Anti Dandruff Shampoo 340ml', c: 'Haircare', p: 590, spec: { Concern: 'Dandruff', Type: 'Oily' }, s: 68 },
		{ t: 'Keratin Smooth Conditioner', c: 'Haircare', p: 680, spec: { Concern: 'Frizz', Type: 'Dry' }, s: 52 },
		{ t: 'Coconut Hair Oil 200ml', c: 'Haircare', p: 320, spec: { Concern: 'Nourishment', Type: 'All' }, s: 92 },
		{ t: 'Onion Hair Oil 200ml', c: 'Haircare', p: 480, was: 580, spec: { Concern: 'Hairfall', Type: 'All' }, s: 64 },
		{ t: 'Hair Serum 100ml', c: 'Haircare', p: 750, spec: { Concern: 'Frizz', Type: 'Dry' }, s: 38 },
		{ t: 'Hair Mask 200g', c: 'Haircare', p: 890, spec: { Concern: 'Damage', Type: 'Dry' }, s: 28 },
		{ t: 'Henna Powder 200g', c: 'Haircare', p: 260, spec: { Concern: 'Colour', Type: 'All' }, s: 80 },
		{ t: 'Dry Shampoo 150ml', c: 'Haircare', p: 720, spec: { Concern: 'Oil Control', Type: 'Oily' }, s: 30 },

		{ t: 'Attar Oud 12ml', c: 'Fragrance', p: 1450, was: 1750, s: 26 },
		{ t: 'Attar Musk Al Haramain', c: 'Fragrance', p: 1250, s: 30 },
		{ t: 'Rose Attar 6ml', c: 'Fragrance', p: 850, s: 44 },
		{ t: 'Eau de Parfum for Women 50ml', c: 'Fragrance', p: 2400, s: 18 },
		{ t: 'Eau de Toilette for Men 100ml', c: 'Fragrance', p: 2900, was: 3400, s: 15 },
		{ t: 'Body Mist 250ml', c: 'Fragrance', p: 680, opt: ['Scent', ['Vanilla', 'Ocean', 'Jasmine']], s: 52 },
		{ t: 'Roll On Deodorant', c: 'Fragrance', p: 320, s: 86 },
		{ t: 'Bakhoor Incense 50g', c: 'Fragrance', p: 950, s: 22 },

		{ t: 'Glycerine Soap Pack of 3', c: 'Bath & Body', p: 380, s: 96 },
		{ t: 'Body Lotion 400ml', c: 'Bath & Body', p: 620, was: 750, s: 58 },
		{ t: 'Shower Gel 250ml', c: 'Bath & Body', p: 480, s: 62 },
		{ t: 'Body Scrub 200g', c: 'Bath & Body', p: 720, s: 34 },
		{ t: 'Hand Cream 75ml', c: 'Bath & Body', p: 350, s: 70 },
		{ t: 'Foot Cream 100ml', c: 'Bath & Body', p: 420, s: 48 },
		{ t: 'Petroleum Jelly 100g', c: 'Bath & Body', p: 180, s: 120 },

		{ t: 'Makeup Brush Set of 12', c: 'Tools & Brushes', p: 1250, was: 1550, s: 24 },
		{ t: 'Beauty Blender Sponge', c: 'Tools & Brushes', p: 280, s: 78 },
		{ t: 'Eyelash Curler', c: 'Tools & Brushes', p: 320, s: 42 },
		{ t: 'Hair Straightener', c: 'Tools & Brushes', p: 2400, s: 16 },
		{ t: 'Hair Dryer 1800W', c: 'Tools & Brushes', p: 2200, was: 2600, s: 14 },
		{ t: 'Facial Steamer', c: 'Tools & Brushes', p: 1850, s: 10 },
		{ t: 'Nail Care Kit', c: 'Tools & Brushes', p: 650, s: 30 },
		{ t: 'Vanity Mirror with Light', c: 'Tools & Brushes', p: 1450, s: 12 }
	],
	hero: {
		heading: 'Original products, sealed and dated',
		subheading: 'No refills, no fakes. Batch code and expiry visible on every parcel before you pay.',
		cta: 'Shop skincare'
	},
	usps: [
		{ title: 'Original or refund', body: 'Batch code on every box' },
		{ title: 'Expiry checked', body: 'Minimum 12 months left' },
		{ title: 'Sealed parcels', body: 'Tamper tape on delivery' },
		{ title: 'Cash on delivery', body: 'Check before you pay' }
	],
	faq: [
		{ q: 'How do I know it is not a fake?', a: 'Every box carries the batch code and expiry, and you can check them against the brand before you pay the rider.' },
		{ q: 'How much shelf life is left?', a: 'We do not ship anything with under 12 months remaining. The expiry is printed on the box, not a sticker.' },
		{ q: 'What if the shade is wrong for me?', a: 'Unopened makeup can be exchanged within 7 days. Opened cosmetics cannot be returned, for hygiene reasons.' },
		{ q: 'Is it safe for sensitive skin?', a: 'Full ingredient lists are on every listing. If you react to something specific, message us and we will tell you honestly whether to avoid it.' }
	],
	quotes: [
		{ quote: 'Checked the batch code on the brand site. Genuine, which is rare here.', name: 'Tasnim R.' },
		{ quote: 'Sunscreen arrived sealed with two years of expiry left.', name: 'Anika F.' },
		{ quote: 'Exchanged a foundation shade without any fuss.', name: 'Maliha C.' }
	],
	promo: { heading: 'Skincare week ends in', subheading: 'Buy any two serums and save 20%' },
	meta: {
		title: 'Rupkotha — original skincare, makeup and fragrance',
		description: 'Sealed, batch-coded skincare, makeup, haircare and attar. Cash on delivery across Bangladesh.'
	}
};
