import type { Vertical } from './types.ts';

const SIZE: [string, string[]] = ['Size', ['S', 'M', 'L', 'XL']];

// Gulf pricing is a different order of magnitude, and abaya/kandura are the
// categories a UAE shop actually leads with.
export const gulfFashion: Vertical = {
	key: 'gulf-fashion',
	shop: 'Layali',
	region: 'middle-east',
	currency: 'AED',
	locale: 'en',
	country: 'AE',
	categories: ['Abayas', 'Kaftans & Jalabiya', 'Kandura & Men', 'Modest Everyday', 'Scarves & Shaylas', 'Bags & Accessories'],
	products: [
		{ t: 'عباية كريب سوداء كلاسيكية', c: 'Abayas', p: 420, was: 520, opt: SIZE, s: 14 },
		{ t: 'Open Abaya with Satin Trim', c: 'Abayas', p: 560, opt: SIZE, s: 11 },
		{ t: 'Embroidered Sleeve Abaya', c: 'Abayas', p: 780, was: 940, opt: SIZE, s: 8 },
		{ t: 'عباية نيدا مطرزة', c: 'Abayas', p: 690, opt: SIZE, s: 9 },
		{ t: 'Butterfly Cut Abaya', c: 'Abayas', p: 495, opt: SIZE, s: 16 },
		{ t: 'Linen Summer Abaya', c: 'Abayas', p: 380, was: 460, opt: SIZE, s: 18 },
		{ t: 'Pleated Formal Abaya', c: 'Abayas', p: 850, opt: SIZE, s: 6 },
		{ t: 'Everyday Crepe Abaya', c: 'Abayas', p: 295, opt: SIZE, s: 24 },

		{ t: 'قفطان مغربي مطرز', c: 'Kaftans & Jalabiya', p: 920, was: 1150, opt: SIZE, s: 7 },
		{ t: 'Silk Kaftan with Belt', c: 'Kaftans & Jalabiya', p: 780, opt: SIZE, s: 10 },
		{ t: 'Ramadan Jalabiya', c: 'Kaftans & Jalabiya', p: 450, was: 560, opt: SIZE, s: 20 },
		{ t: 'Printed Cotton Jalabiya', c: 'Kaftans & Jalabiya', p: 320, opt: SIZE, s: 26 },
		{ t: 'Beaded Evening Kaftan', c: 'Kaftans & Jalabiya', p: 1450, opt: SIZE, s: 4 },
		{ t: 'Two Piece Kaftan Set', c: 'Kaftans & Jalabiya', p: 690, was: 820, opt: SIZE, s: 12 },

		{ t: 'كندورة إماراتية بيضاء', c: 'Kandura & Men', p: 380, opt: SIZE, s: 22 },
		{ t: 'Emirati Kandura Premium Cotton', c: 'Kandura & Men', p: 520, was: 620, opt: SIZE, s: 15 },
		{ t: 'Winter Kandura Wool Blend', c: 'Kandura & Men', p: 640, opt: SIZE, s: 10 },
		{ t: 'Ghutra and Agal Set', c: 'Kandura & Men', p: 180, s: 40 },
		{ t: 'Bisht Formal Cloak', c: 'Kandura & Men', p: 1850, was: 2200, opt: SIZE, s: 3 },
		{ t: 'Men’s Prayer Cap', c: 'Kandura & Men', p: 45, s: 60 },

		{ t: 'Modest Wide Leg Trousers', c: 'Modest Everyday', p: 210, opt: SIZE, s: 28 },
		{ t: 'Longline Modest Shirt', c: 'Modest Everyday', p: 245, was: 310, opt: SIZE, s: 24 },
		{ t: 'Maxi Knit Dress', c: 'Modest Everyday', p: 330, opt: SIZE, s: 18 },
		{ t: 'Linen Modest Co-ord Set', c: 'Modest Everyday', p: 420, opt: SIZE, s: 14 },
		{ t: 'Pleated Midi Skirt', c: 'Modest Everyday', p: 265, opt: SIZE, s: 20 },
		{ t: 'Oversized Cardigan', c: 'Modest Everyday', p: 290, was: 350, opt: SIZE, s: 16 },

		{ t: 'شيلة حرير سادة', c: 'Scarves & Shaylas', p: 120, opt: ['Colour', ['Black', 'Ivory', 'Grey', 'Navy']], sw: ['#1b1b1e', '#f0ebe1', '#7c8087', '#243a5e'], s: 45 },
		{ t: 'Chiffon Hijab Set of 3', c: 'Scarves & Shaylas', p: 195, was: 240, s: 32 },
		{ t: 'Jersey Everyday Hijab', c: 'Scarves & Shaylas', p: 85, opt: ['Colour', ['Black', 'Beige', 'Olive']], sw: ['#1b1b1e', '#d8c9ad', '#5c6446'], s: 55 },
		{ t: 'Embellished Occasion Shayla', c: 'Scarves & Shaylas', p: 340, s: 12 },
		{ t: 'Silk Blend Wrap', c: 'Scarves & Shaylas', p: 260, s: 18 },
		{ t: 'Under-scarf Cap Pack', c: 'Scarves & Shaylas', p: 55, s: 70 },

		{ t: 'Leather Tote Bag', c: 'Bags & Accessories', p: 690, was: 850, s: 9 },
		{ t: 'Evening Clutch with Chain', c: 'Bags & Accessories', p: 380, s: 14 },
		{ t: 'Gold Plated Bangle Set', c: 'Bags & Accessories', p: 450, s: 11 },
		{ t: 'Pearl Drop Earrings', c: 'Bags & Accessories', p: 290, s: 16 },
		{ t: 'Oud Perfume Oil 12ml', c: 'Bags & Accessories', p: 320, was: 400, s: 22 },
		{ t: 'Silk Scarf Gift Box', c: 'Bags & Accessories', p: 240, s: 19 }
	],
	hero: {
		heading: 'Ramadan collection, delivered tomorrow',
		subheading: 'Abayas, kaftans and kandura across the Emirates — free returns within 14 days.',
		cta: 'Shop abayas'
	},
	usps: [
		{ title: 'Next-day delivery', body: 'Across all seven emirates' },
		{ title: 'Free returns', body: '14 days, collected from you' },
		{ title: 'Pay in 4', body: 'Tabby and Tamara, no interest' },
		{ title: 'Prices include VAT', body: 'What you see is what you pay' }
	],
	faq: [
		{ q: 'How fast is delivery?', a: 'Next day across all seven emirates, and same day in Dubai and Sharjah for orders placed before noon.' },
		{ q: 'Can I pay in instalments?', a: 'Yes — Tabby and Tamara split any order into four payments with no interest. Choose it at checkout.' },
		{ q: 'What is your returns policy?', a: 'Fourteen days, free, and the courier collects from your address. Items must be unworn with tags on.' },
		{ q: 'Are prices inclusive of VAT?', a: 'Yes. Every price shown includes 5% VAT, as required in the UAE. There is nothing added at checkout.' }
	],
	quotes: [
		{ quote: 'Ordered on Sunday evening, wore it Monday night. The fit was exactly as the chart said.', name: 'Mariam A., Dubai' },
		{ quote: 'Paid with Tabby in four instalments. Simple, and no interest.', name: 'Fatima K., Sharjah' },
		{ quote: 'Returned one size and the driver collected it the next morning.', name: 'Aisha R., Abu Dhabi' }
	],
	promo: { heading: 'Ramadan offer ends in', subheading: 'Up to 25% off abayas and kaftans' },
	announcement: 'Free next-day delivery across the UAE · Free returns within 14 days',
	supportHours: 'Sat–Thu, 9am–9pm GST',
	meta: {
		title: 'Layali — abayas, kaftans and kandura in the UAE',
		description: 'Abayas, kaftans, kandura and modest everyday wear. Next-day delivery across the Emirates, free returns, pay in 4 with Tabby.'
	}
};
