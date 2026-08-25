import type { Vertical } from './types.ts';

const AGE: [string, string[]] = ['Age', ['0-1y', '1-2y', '3-4y', '5-6y', '7-8y']];
const SZ: [string, string[]] = ['Size', ['S', 'M', 'L', 'XL']];

export const kids: Vertical = {
	key: 'kids',
	region: 'south-asia',
	currency: 'BDT',
	locale: 'bn',
	country: 'BD',
	shop: 'Choto Bela',
	categories: ['Boys Clothing', 'Girls Clothing', 'Baby Care', 'Toys & Games', 'School Supplies', 'Footwear'],
	products: [
		{ t: 'Cotton Half Sleeve T-Shirt', c: 'Boys Clothing', p: 450, was: 620, opt: AGE, s: 30 },
		{ t: 'Denim Dungaree', c: 'Boys Clothing', p: 1150, opt: AGE, s: 14 },
		{ t: 'Printed Pyjama Set', c: 'Boys Clothing', p: 680, was: 850, opt: AGE, s: 22 },
		{ t: 'Eid Panjabi for Boys', c: 'Boys Clothing', p: 1250, opt: AGE, s: 18 },
		{ t: 'Cargo Shorts', c: 'Boys Clothing', p: 520, opt: AGE, s: 26 },
		{ t: 'Hooded Sweatshirt', c: 'Boys Clothing', p: 980, was: 1200, opt: AGE, s: 16 },
		{ t: 'Full Sleeve Polo Shirt', c: 'Boys Clothing', p: 620, opt: AGE, s: 24 },
		{ t: 'Winter Jacket', c: 'Boys Clothing', p: 1850, was: 2300, opt: AGE, s: 9 },
		{ t: 'Cotton Trouser', c: 'Boys Clothing', p: 750, opt: AGE, s: 20 },
		{ t: 'Kabli Set for Boys', c: 'Boys Clothing', p: 1650, opt: AGE, s: 11 },

		{ t: 'Frock with Bow', c: 'Girls Clothing', p: 890, was: 1150, opt: AGE, s: 21 },
		{ t: 'Cotton Salwar Set', c: 'Girls Clothing', p: 1050, opt: AGE, s: 17 },
		{ t: 'Party Gown', c: 'Girls Clothing', p: 2200, was: 2800, opt: AGE, s: 8 },
		{ t: 'Printed Leggings Pair', c: 'Girls Clothing', p: 380, opt: AGE, s: 34 },
		{ t: 'Denim Skirt', c: 'Girls Clothing', p: 720, opt: AGE, s: 19 },
		{ t: 'Floral Summer Dress', c: 'Girls Clothing', p: 850, was: 1050, opt: AGE, s: 23 },
		{ t: 'Woollen Cardigan', c: 'Girls Clothing', p: 1150, opt: AGE, s: 13 },
		{ t: 'Nightdress Set', c: 'Girls Clothing', p: 640, opt: AGE, s: 25 },
		{ t: 'Lehenga Set for Girls', c: 'Girls Clothing', p: 2650, was: 3200, opt: AGE, s: 6 },
		{ t: 'Cotton Top and Skirt', c: 'Girls Clothing', p: 780, opt: AGE, s: 20 },

		{ t: 'Baby Diaper Pack (Medium)', c: 'Baby Care', p: 1250, was: 1450, opt: ['Pack', ['Small', 'Medium', 'Large', 'XL']], s: 40 },
		{ t: 'Baby Wipes 80 Sheets', c: 'Baby Care', p: 280, s: 55 },
		{ t: 'Baby Shampoo 200ml', c: 'Baby Care', p: 420, s: 38 },
		{ t: 'Baby Lotion 250ml', c: 'Baby Care', p: 480, was: 560, s: 32 },
		{ t: 'Feeding Bottle 250ml', c: 'Baby Care', p: 650, s: 28 },
		{ t: 'Baby Blanket', c: 'Baby Care', p: 950, s: 18 },
		{ t: 'Muslin Swaddle Set of 3', c: 'Baby Care', p: 1350, was: 1600, s: 14 },
		{ t: 'Baby Powder 200g', c: 'Baby Care', p: 240, s: 46 },
		{ t: 'Newborn Gift Set', c: 'Baby Care', p: 2400, s: 10 },
		{ t: 'Baby Nail Clipper Set', c: 'Baby Care', p: 320, s: 42 },

		{ t: 'Wooden Building Blocks', c: 'Toys & Games', p: 1150, was: 1400, s: 16 },
		{ t: 'Remote Control Car', c: 'Toys & Games', p: 1850, s: 12 },
		{ t: 'Soft Teddy Bear', c: 'Toys & Games', p: 780, opt: ['Size', ['Small', 'Medium', 'Large']], s: 24 },
		{ t: 'Puzzle Set 100 Pieces', c: 'Toys & Games', p: 450, s: 30 },
		{ t: 'Doll House Play Set', c: 'Toys & Games', p: 2650, was: 3100, s: 7 },
		{ t: 'Cricket Bat and Ball Set', c: 'Toys & Games', p: 950, s: 20 },
		{ t: 'Colouring Book with Crayons', c: 'Toys & Games', p: 280, s: 48 },
		{ t: 'Musical Keyboard Toy', c: 'Toys & Games', p: 1450, s: 11 },
		{ t: 'Ludo and Carrom Board', c: 'Toys & Games', p: 1250, was: 1500, s: 15 },
		{ t: 'Kitchen Play Set', c: 'Toys & Games', p: 1650, s: 9 },

		{ t: 'School Backpack', c: 'School Supplies', p: 1250, was: 1500, opt: ['Colour', ['Navy', 'Red', 'Green']], sw: ['#243a5e', '#a52a34', '#2f6b46'], s: 26 },
		{ t: 'Geometry Box', c: 'School Supplies', p: 220, s: 60 },
		{ t: 'Water Bottle 750ml', c: 'School Supplies', p: 380, s: 44 },
		{ t: 'Tiffin Box Steel', c: 'School Supplies', p: 520, was: 650, s: 30 },
		{ t: 'Exercise Book Pack of 10', c: 'School Supplies', p: 320, s: 70 },
		{ t: 'Pencil Case', c: 'School Supplies', p: 180, s: 65 },
		{ t: 'Colour Pencil Set of 24', c: 'School Supplies', p: 290, s: 38 },
		{ t: 'School Shoes Black', c: 'School Supplies', p: 1150, opt: ['Size', ['28', '30', '32', '34', '36']], s: 22 },

		{ t: 'Canvas Sneakers', c: 'Footwear', p: 850, was: 1050, opt: ['Size', ['26', '28', '30', '32', '34']], s: 24 },
		{ t: 'Rubber Sandals', c: 'Footwear', p: 320, opt: ['Size', ['24', '26', '28', '30']], s: 40 },
		{ t: 'Party Shoes for Girls', c: 'Footwear', p: 950, opt: ['Size', ['26', '28', '30', '32']], s: 16 },
		{ t: 'Sports Shoes', c: 'Footwear', p: 1450, was: 1750, opt: SZ, s: 18 },
		{ t: 'Winter Boots', c: 'Footwear', p: 1250, opt: SZ, s: 12 },
		{ t: 'Baby Soft Sole Shoes', c: 'Footwear', p: 480, opt: ['Size', ['0-6m', '6-12m', '12-18m']], s: 28 }
	],
	hero: {
		heading: 'Back to school, sorted',
		subheading: 'Clothes, bags and books for 0 to 12 — with sizes that actually run true.',
		cta: 'Shop school supplies'
	},
	usps: [
		{ title: 'True to size', body: 'Measurements on every listing' },
		{ title: 'Cash on delivery', body: 'All 64 districts' },
		{ title: 'Free exchange', body: 'Wrong size, no questions' },
		{ title: 'Skin safe', body: 'Azo-free dyes on baby wear' }
	],
	faq: [
		{ q: 'How do I pick the right size?', a: 'Every listing has chest and length in inches. Measure a garment your child already wears and match it.' },
		{ q: 'What if the size is wrong?', a: 'Free exchange within 7 days, unworn and with the tag on. We pay the return courier once.' },
		{ q: 'Are the baby products safe?', a: 'Baby wear is azo-free dyed cotton, and all creams and shampoos are sealed, dated stock.' },
		{ q: 'Can I pay cash on delivery?', a: 'Yes, everywhere in Bangladesh. Delivery charge is paid in advance by bKash.' }
	],
	quotes: [
		{ quote: 'Ordered two frocks, both fitted exactly as the chart said. Rare.', name: 'Farhana K.' },
		{ quote: 'School bag survived a full year. Ordering the same one again.', name: 'Mahmud R.' },
		{ quote: 'Exchanged a size without any argument. Took three days.', name: 'Shirin A.' }
	],
	announcement: 'Cash on delivery · Free size exchange within 7 days',
	supportHours: 'Sat–Thu, 10am–8pm',
	promo: { heading: 'School season ends in', subheading: 'Up to 25% off bags, shoes and stationery' },
	meta: {
		title: 'Choto Bela — kids clothing, toys and school supplies',
		description: 'Clothes, toys and school supplies for 0 to 12. True sizing, free exchange, cash on delivery across Bangladesh.'
	}
};
