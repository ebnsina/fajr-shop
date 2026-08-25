import type { Vertical } from './types.ts';

const SIZES = ['S', 'M', 'L', 'XL'];
const size = (): [string, string[]] => ['Size', SIZES];

export const fashion: Vertical = {
	key: 'fashion',
	shop: 'Neel Tanti',
	categories: ['Sarees', 'Salwar Kameez', 'Kurti', 'Panjabi', 'Shawls & Scarves', 'Bags & Jewellery'],
	products: [
		{ t: 'লাল সিল্ক শাড়ি', c: 'Sarees', p: 4200, was: 5200, opt: ['Colour', ['Crimson', 'Maroon', 'Rust']], sw: ['#961e2a', '#5c1a1a', '#8a4423'], s: 6 },
		{ t: 'নীল জামদানি শাড়ি', c: 'Sarees', p: 6800, was: 7900, opt: ['Colour', ['Indigo', 'Steel']], sw: ['#2c3a6e', '#4a5b7a'], s: 4 },
		{ t: 'সবুজ কাতান শাড়ি', c: 'Sarees', p: 5500, opt: ['Colour', ['Emerald', 'Bottle']], sw: ['#185c4a', '#0f3d31'], s: 5 },
		{ t: 'Half Silk Tangail Saree', c: 'Sarees', p: 3200, was: 3900, opt: ['Colour', ['Ivory', 'Blush', 'Sky']], sw: ['#efe6d4', '#e4bfc0', '#a8c4d8'], s: 9 },
		{ t: 'Muslin Jamdani Saree', c: 'Sarees', p: 12500, was: 14000, opt: ['Colour', ['Off White', 'Pearl']], sw: ['#f2ece0', '#e8e4dc'], s: 2 },
		{ t: 'Dhakai Benarasi Saree', c: 'Sarees', p: 9800, opt: ['Colour', ['Gold', 'Magenta']], sw: ['#b8912f', '#a02b5f'], s: 3 },
		{ t: 'Cotton Tant Saree', c: 'Sarees', p: 1850, was: 2400, opt: ['Colour', ['White Red', 'Green', 'Navy']], sw: ['#f0e8de', '#2f6b46', '#243a5e'], s: 14 },
		{ t: 'Georgette Party Saree', c: 'Sarees', p: 4600, opt: ['Colour', ['Wine', 'Black']], sw: ['#6b1f38', '#232326'], s: 7 },
		{ t: 'Printed Silk Saree', c: 'Sarees', p: 2900, was: 3500, opt: ['Colour', ['Teal', 'Mustard']], sw: ['#226068', '#c69428'], s: 11 },
		{ t: 'Handloom Rajshahi Silk', c: 'Sarees', p: 7400, opt: ['Colour', ['Saffron', 'Plum']], sw: ['#d08a2c', '#6c3460'], s: 4 },

		{ t: 'Embroidered Cotton Three Piece', c: 'Salwar Kameez', p: 2650, was: 3200, opt: size(), s: 12 },
		{ t: 'Lawn Unstitched Three Piece', c: 'Salwar Kameez', p: 1950, opt: size(), s: 18 },
		{ t: 'Karchupi Party Three Piece', c: 'Salwar Kameez', p: 5400, was: 6500, opt: size(), s: 6 },
		{ t: 'Block Print Salwar Set', c: 'Salwar Kameez', p: 2100, opt: size(), s: 15 },
		{ t: 'Linen Straight Cut Set', c: 'Salwar Kameez', p: 2850, opt: size(), s: 9 },
		{ t: 'Silk Anarkali Set', c: 'Salwar Kameez', p: 6200, was: 7400, opt: size(), s: 5 },
		{ t: 'Everyday Cotton Two Piece', c: 'Salwar Kameez', p: 1450, opt: size(), s: 22 },
		{ t: 'Chikankari Kameez Set', c: 'Salwar Kameez', p: 3900, opt: size(), s: 8 },

		{ t: 'Mustard Cotton Kurti', c: 'Kurti', p: 1650, was: 2100, opt: size(), s: 16 },
		{ t: 'Rose Embroidered Kurti', c: 'Kurti', p: 1950, opt: size(), s: 11 },
		{ t: 'Sand Linen Kurti', c: 'Kurti', p: 1800, opt: size(), s: 13 },
		{ t: 'Charcoal Everyday Kurti', c: 'Kurti', p: 1550, opt: size(), s: 20 },
		{ t: 'Indigo Block Print Kurti', c: 'Kurti', p: 1750, was: 2200, opt: size(), s: 14 },
		{ t: 'White Chikan Kurti', c: 'Kurti', p: 2250, opt: size(), s: 10 },
		{ t: 'Rayon A-Line Kurti', c: 'Kurti', p: 1350, opt: size(), s: 25 },
		{ t: 'Kantha Stitch Kurti', c: 'Kurti', p: 2650, was: 3100, opt: size(), s: 7 },
		{ t: 'Sleeveless Summer Kurti', c: 'Kurti', p: 1250, opt: size(), s: 19 },
		{ t: 'Long Georgette Kurti', c: 'Kurti', p: 2150, opt: size(), s: 12 },

		{ t: 'Cream Cotton Panjabi', c: 'Panjabi', p: 2350, opt: size(), s: 12 },
		{ t: 'Navy Festive Panjabi', c: 'Panjabi', p: 3200, was: 3800, opt: size(), s: 9 },
		{ t: 'White Eid Panjabi', c: 'Panjabi', p: 2800, opt: size(), s: 15 },
		{ t: 'Black Silk Panjabi', c: 'Panjabi', p: 4100, was: 4900, opt: size(), s: 6 },
		{ t: 'Khadi Cotton Panjabi', c: 'Panjabi', p: 1950, opt: size(), s: 18 },
		{ t: 'Printed Casual Panjabi', c: 'Panjabi', p: 1650, opt: size(), s: 21 },
		{ t: 'Embroidered Collar Panjabi', c: 'Panjabi', p: 3450, opt: size(), s: 8 },
		{ t: 'Short Kabli Set', c: 'Panjabi', p: 3900, was: 4500, opt: size(), s: 7 },

		{ t: 'Plum Wool Shawl', c: 'Shawls & Scarves', p: 2400, was: 2900, s: 8 },
		{ t: 'Teal Handloom Shawl', c: 'Shawls & Scarves', p: 2250, s: 10 },
		{ t: 'Pashmina Blend Shawl', c: 'Shawls & Scarves', p: 3800, was: 4400, s: 5 },
		{ t: 'Kashmiri Embroidered Shawl', c: 'Shawls & Scarves', p: 5200, s: 4 },
		{ t: 'Cotton Orna Dupatta', c: 'Shawls & Scarves', p: 650, opt: ['Colour', ['Red', 'Black', 'Beige', 'Green']], sw: ['#a52a34', '#232326', '#d8c9ad', '#2f6b46'], s: 30 },
		{ t: 'Silk Printed Scarf', c: 'Shawls & Scarves', p: 890, s: 24 },
		{ t: 'Winter Muffler', c: 'Shawls & Scarves', p: 550, opt: ['Colour', ['Grey', 'Navy', 'Maroon']], sw: ['#6b6f76', '#243a5e', '#5c1a1a'], s: 35 },
		{ t: 'Nakshi Kantha Wrap', c: 'Shawls & Scarves', p: 4600, s: 3 },

		{ t: 'Jute Tote Bag', c: 'Bags & Jewellery', p: 750, s: 28 },
		{ t: 'Leather Sling Bag', c: 'Bags & Jewellery', p: 2400, was: 2900, s: 11 },
		{ t: 'Embroidered Clutch', c: 'Bags & Jewellery', p: 1350, s: 14 },
		{ t: 'Silver Jhumka Earrings', c: 'Bags & Jewellery', p: 1150, s: 20 },
		{ t: 'Terracotta Necklace Set', c: 'Bags & Jewellery', p: 950, was: 1250, s: 17 },
		{ t: 'Pearl Choker', c: 'Bags & Jewellery', p: 1650, s: 9 },
		{ t: 'Oxidised Bangle Pair', c: 'Bags & Jewellery', p: 680, s: 26 },
		{ t: 'Beaded Hair Clip Set', c: 'Bags & Jewellery', p: 320, s: 40 }
	],
	hero: {
		heading: 'Eid collection is here',
		subheading: 'Handwoven silk, Jamdani and everyday cotton — delivered to all 64 districts.',
		cta: 'Shop sarees'
	},
	usps: [
		{ title: 'Cash on delivery', body: 'All 64 districts' },
		{ title: 'Free delivery', body: 'On orders over ৳5,000' },
		{ title: 'Easy exchange', body: 'Within 7 days' },
		{ title: 'Real photos', body: 'What you see is what ships' }
	],
	faq: [
		{ q: 'Do you deliver outside Dhaka?', a: 'Yes, to all 64 districts. Inside Dhaka is ৳60, outside is ৳120, and delivery is free over ৳5,000.' },
		{ q: 'Can I pay cash on delivery?', a: 'Yes. The delivery charge is paid in advance by bKash and the rest to the courier.' },
		{ q: 'What if it does not fit?', a: 'Exchange within 7 days, unworn and with the tag on.' },
		{ q: 'Is the colour the same as the photo?', a: 'Photos are taken in daylight without filters. Screens vary slightly, so message us if you need a closer look.' }
	],
	quotes: [
		{ quote: 'The saree looked exactly like the photo. Delivery took two days to Chattogram.', name: 'Rina A.' },
		{ quote: 'Paid cash on delivery, no problem. The kurti fabric is genuinely soft.', name: 'Sadia H.' },
		{ quote: 'Called to confirm before shipping, which I appreciated.', name: 'Nusrat J.' }
	],
	promo: { heading: 'Eid offer ends in', subheading: 'Up to 20% off selected sarees' },
	meta: {
		title: 'Neel Tanti — handwoven sarees, kurti and panjabi',
		description: 'Handwoven silk, Jamdani and everyday cotton. Cash on delivery across Bangladesh.'
	}
};
