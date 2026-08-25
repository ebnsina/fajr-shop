import type { Vertical } from './types.ts';

const KG: [string, string[]] = ['Pack', ['1 kg', '2 kg', '5 kg']];
const L: [string, string[]] = ['Size', ['500 ml', '1 L', '2 L', '5 L']];

export const grocery: Vertical = {
	key: 'grocery',
	region: 'south-asia',
	currency: 'BDT',
	locale: 'bn',
	country: 'BD',
	shop: 'Bazar Ghor',
	categories: ['Rice & Grains', 'Cooking Oil & Ghee', 'Spices & Masala', 'Dal & Pulses', 'Snacks & Biscuits', 'Tea, Coffee & Drinks', 'Dairy & Eggs'],
	units: { Weight: 'kg', Volume: 'L' },
	products: [
		{ t: 'Miniket Rice Premium', c: 'Rice & Grains', p: 82, was: 90, opt: ['Pack', ['1 kg', '5 kg', '25 kg', '50 kg']], spec: { Type: 'Miniket', Origin: 'Dinajpur' }, s: 120 },
		{ t: 'Nazirshail Rice', c: 'Rice & Grains', p: 78, opt: ['Pack', ['1 kg', '5 kg', '25 kg']], spec: { Type: 'Nazirshail', Origin: 'Naogaon' }, s: 90 },
		{ t: 'Chinigura Aromatic Rice', c: 'Rice & Grains', p: 135, was: 150, opt: KG, spec: { Type: 'Chinigura', Origin: 'Naogaon' }, s: 70 },
		{ t: 'Basmati Rice Imported', c: 'Rice & Grains', p: 210, opt: KG, spec: { Type: 'Basmati', Origin: 'India' }, s: 45 },
		{ t: 'Red Rice (Lal Chal)', c: 'Rice & Grains', p: 95, opt: KG, spec: { Type: 'Red', Origin: 'Local' }, s: 55 },
		{ t: 'Atta Whole Wheat Flour', c: 'Rice & Grains', p: 62, was: 70, opt: KG, spec: { Type: 'Atta', Origin: 'Local' }, s: 100 },
		{ t: 'Maida Refined Flour', c: 'Rice & Grains', p: 68, opt: KG, spec: { Type: 'Maida', Origin: 'Local' }, s: 85 },
		{ t: 'Suji Semolina', c: 'Rice & Grains', p: 75, opt: ['Pack', ['500 g', '1 kg']], spec: { Type: 'Suji', Origin: 'Local' }, s: 60 },
		{ t: 'Poha Flattened Rice', c: 'Rice & Grains', p: 90, opt: ['Pack', ['500 g', '1 kg']], spec: { Type: 'Chira', Origin: 'Local' }, s: 48 },
		{ t: 'Muri Puffed Rice', c: 'Rice & Grains', p: 110, opt: ['Pack', ['500 g', '1 kg']], spec: { Type: 'Muri', Origin: 'Local' }, s: 52 },

		{ t: 'Soybean Oil', c: 'Cooking Oil & Ghee', p: 175, was: 190, opt: L, spec: { Type: 'Soybean' }, s: 140 },
		{ t: 'Mustard Oil Cold Pressed', c: 'Cooking Oil & Ghee', p: 320, opt: ['Size', ['250 ml', '500 ml', '1 L']], spec: { Type: 'Mustard' }, s: 75 },
		{ t: 'Sunflower Oil', c: 'Cooking Oil & Ghee', p: 210, opt: L, spec: { Type: 'Sunflower' }, s: 88 },
		{ t: 'Rice Bran Oil', c: 'Cooking Oil & Ghee', p: 235, was: 260, opt: L, spec: { Type: 'Rice Bran' }, s: 62 },
		{ t: 'Olive Oil Extra Virgin', c: 'Cooking Oil & Ghee', p: 890, opt: ['Size', ['250 ml', '500 ml', '1 L']], spec: { Type: 'Olive' }, s: 30 },
		{ t: 'Pure Cow Ghee', c: 'Cooking Oil & Ghee', p: 1250, was: 1400, opt: ['Size', ['200 g', '500 g', '1 kg']], spec: { Type: 'Ghee' }, s: 35 },
		{ t: 'Coconut Oil', c: 'Cooking Oil & Ghee', p: 280, opt: ['Size', ['200 ml', '500 ml']], spec: { Type: 'Coconut' }, s: 44 },

		{ t: 'Turmeric Powder', c: 'Spices & Masala', p: 95, opt: ['Pack', ['100 g', '200 g', '500 g']], spec: { Form: 'Powder' }, s: 110 },
		{ t: 'Chilli Powder', c: 'Spices & Masala', p: 145, was: 165, opt: ['Pack', ['100 g', '200 g', '500 g']], spec: { Form: 'Powder' }, s: 105 },
		{ t: 'Coriander Powder', c: 'Spices & Masala', p: 88, opt: ['Pack', ['100 g', '200 g']], spec: { Form: 'Powder' }, s: 95 },
		{ t: 'Cumin Seed Whole', c: 'Spices & Masala', p: 380, opt: ['Pack', ['100 g', '250 g']], spec: { Form: 'Whole' }, s: 58 },
		{ t: 'Garam Masala Blend', c: 'Spices & Masala', p: 165, was: 195, opt: ['Pack', ['50 g', '100 g']], spec: { Form: 'Blend' }, s: 72 },
		{ t: 'Cardamom Green', c: 'Spices & Masala', p: 850, opt: ['Pack', ['50 g', '100 g']], spec: { Form: 'Whole' }, s: 26 },
		{ t: 'Cinnamon Stick', c: 'Spices & Masala', p: 220, opt: ['Pack', ['50 g', '100 g']], spec: { Form: 'Whole' }, s: 40 },
		{ t: 'Bay Leaf', c: 'Spices & Masala', p: 75, opt: ['Pack', ['25 g', '50 g']], spec: { Form: 'Whole' }, s: 55 },
		{ t: 'Panch Phoron Mix', c: 'Spices & Masala', p: 130, opt: ['Pack', ['100 g', '200 g']], spec: { Form: 'Blend' }, s: 48 },
		{ t: 'Biryani Masala', c: 'Spices & Masala', p: 185, was: 210, opt: ['Pack', ['50 g', '100 g']], spec: { Form: 'Blend' }, s: 66 },

		{ t: 'Masoor Dal Red Lentil', c: 'Dal & Pulses', p: 135, opt: KG, s: 95 },
		{ t: 'Mug Dal Moong', c: 'Dal & Pulses', p: 165, was: 180, opt: KG, s: 78 },
		{ t: 'Chhola Bhuna Chickpea', c: 'Dal & Pulses', p: 120, opt: KG, s: 88 },
		{ t: 'Khesari Dal', c: 'Dal & Pulses', p: 105, opt: KG, s: 62 },
		{ t: 'Anchor Dal Split Pea', c: 'Dal & Pulses', p: 98, opt: KG, s: 70 },
		{ t: 'Motor Dal', c: 'Dal & Pulses', p: 112, opt: KG, s: 58 },
		{ t: 'Kidney Beans Rajma', c: 'Dal & Pulses', p: 240, was: 270, opt: ['Pack', ['500 g', '1 kg']], s: 42 },

		{ t: 'Energy Biscuit Family Pack', c: 'Snacks & Biscuits', p: 85, was: 95, s: 150 },
		{ t: 'Cream Biscuit Assorted', c: 'Snacks & Biscuits', p: 120, s: 130 },
		{ t: 'Salted Chanachur', c: 'Snacks & Biscuits', p: 95, opt: ['Pack', ['150 g', '350 g']], s: 118 },
		{ t: 'Potato Chips', c: 'Snacks & Biscuits', p: 45, opt: ['Pack', ['25 g', '50 g', '100 g']], s: 200 },
		{ t: 'Roasted Peanuts', c: 'Snacks & Biscuits', p: 160, opt: ['Pack', ['250 g', '500 g']], s: 74 },
		{ t: 'Toast Biscuit', c: 'Snacks & Biscuits', p: 70, s: 96 },
		{ t: 'Instant Noodles Pack of 8', c: 'Snacks & Biscuits', p: 145, was: 168, s: 165 },
		{ t: 'Mixed Nuts Premium', c: 'Snacks & Biscuits', p: 680, opt: ['Pack', ['250 g', '500 g']], s: 34 },
		{ t: 'Dates Ajwa', c: 'Snacks & Biscuits', p: 1450, was: 1650, opt: ['Pack', ['500 g', '1 kg']], s: 22 },

		{ t: 'Black Tea Loose Leaf', c: 'Tea, Coffee & Drinks', p: 320, opt: ['Pack', ['200 g', '400 g', '1 kg']], s: 82 },
		{ t: 'Green Tea Bags 100pc', c: 'Tea, Coffee & Drinks', p: 420, was: 480, s: 56 },
		{ t: 'Instant Coffee Jar', c: 'Tea, Coffee & Drinks', p: 550, opt: ['Pack', ['50 g', '100 g', '200 g']], s: 64 },
		{ t: 'Masala Tea Premix', c: 'Tea, Coffee & Drinks', p: 280, s: 48 },
		{ t: 'Mango Juice 1L', c: 'Tea, Coffee & Drinks', p: 130, was: 145, s: 110 },
		{ t: 'Drinking Water 2L', c: 'Tea, Coffee & Drinks', p: 35, s: 300 },
		{ t: 'Rooh Afza Syrup', c: 'Tea, Coffee & Drinks', p: 340, s: 68 },

		{ t: 'Liquid Milk 1L', c: 'Dairy & Eggs', p: 95, s: 140 },
		{ t: 'Full Cream Milk Powder', c: 'Dairy & Eggs', p: 720, was: 790, opt: ['Pack', ['500 g', '1 kg']], s: 76 },
		{ t: 'Farm Eggs Dozen', c: 'Dairy & Eggs', p: 145, s: 180 },
		{ t: 'Sweet Yoghurt (Mishti Doi)', c: 'Dairy & Eggs', p: 130, s: 65 },
		{ t: 'Butter 200g', c: 'Dairy & Eggs', p: 380, s: 52 },
		{ t: 'Cheese Slice Pack', c: 'Dairy & Eggs', p: 420, was: 470, s: 44 },
		{ t: 'Condensed Milk', c: 'Dairy & Eggs', p: 165, s: 88 }
	],
	hero: {
		heading: 'This month’s bazar, delivered',
		subheading: 'Rice, oil, dal and spices at wholesale rates. Order by 10pm, delivered tomorrow inside Dhaka.',
		cta: 'Shop rice & grains'
	},
	usps: [
		{ title: 'Next day in Dhaka', body: 'Order before 10pm' },
		{ title: 'Wholesale rates', body: 'Cheaper by the 25kg sack' },
		{ title: 'Weighed in front of you', body: 'Or your money back' },
		{ title: 'Cash on delivery', body: 'Pay when it arrives' }
	],
	faq: [
		{ q: 'How fast is delivery?', a: 'Inside Dhaka, order before 10pm and it arrives the next day. Outside Dhaka takes two to three days by courier.' },
		{ q: 'Is the weight accurate?', a: 'Sacks are weighed at dispatch and again at your door. If it is short, you pay nothing.' },
		{ q: 'What if something is damaged or expired?', a: 'Refuse it at the door and tell the rider. We replace it on the next trip at no charge.' },
		{ q: 'Do you deliver a full month’s bazar?', a: 'Yes. Most customers order 25kg or 50kg rice with oil and dal together, which is where the price drops most.' }
	],
	quotes: [
		{ quote: 'The 50kg miniket was cheaper than my local shop and came the next morning.', name: 'Abdul K.' },
		{ quote: 'Weighed the dal myself. Exactly right, which I did not expect.', name: 'Rehana B.' },
		{ quote: 'Ordering the whole month at once now. Saves two trips to Karwan Bazar.', name: 'Imran H.' }
	],
	announcement: 'Order before 10pm · Next-day delivery inside Dhaka',
	supportHours: 'Every day, 8am–10pm',
	promo: { heading: 'Ramadan bazar offer ends in', subheading: 'Rice, oil and dal bundles at wholesale rates' },
	meta: {
		title: 'Bazar Ghor — rice, oil, dal and spices delivered',
		description: 'Wholesale rice, cooking oil, dal and spices delivered next day in Dhaka. Cash on delivery across Bangladesh.'
	}
};
