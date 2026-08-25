import type { Vertical } from './types.ts';

export const home: Vertical = {
	key: 'home',
	shop: 'Ghor Shonshar',
	categories: ['Kitchen & Dining', 'Bedding & Bath', 'Furniture', 'Home Decor', 'Storage & Organisation', 'Cleaning'],
	products: [
		{ t: 'Non Stick Frying Pan 26cm', c: 'Kitchen & Dining', p: 1450, was: 1750, spec: { Material: 'Aluminium' }, s: 28 },
		{ t: 'Pressure Cooker 5L', c: 'Kitchen & Dining', p: 3200, spec: { Material: 'Aluminium' }, s: 18 },
		{ t: 'Stainless Steel Cookware Set', c: 'Kitchen & Dining', p: 5400, was: 6200, spec: { Material: 'Steel' }, s: 9 },
		{ t: 'Dinner Set 32 Pieces', c: 'Kitchen & Dining', p: 4200, spec: { Material: 'Ceramic' }, s: 12 },
		{ t: 'Melamine Plate Set of 6', c: 'Kitchen & Dining', p: 950, spec: { Material: 'Melamine' }, s: 40 },
		{ t: 'Glass Water Jug 1.5L', c: 'Kitchen & Dining', p: 620, spec: { Material: 'Glass' }, s: 34 },
		{ t: 'Rice Cooker 1.8L', c: 'Kitchen & Dining', p: 2800, was: 3200, spec: { Material: 'Steel' }, s: 22 },
		{ t: 'Electric Kettle 1.7L', c: 'Kitchen & Dining', p: 1650, spec: { Material: 'Steel' }, s: 30 },
		{ t: 'Chopping Board Set', c: 'Kitchen & Dining', p: 480, spec: { Material: 'Plastic' }, s: 55 },
		{ t: 'Knife Set with Block', c: 'Kitchen & Dining', p: 1850, spec: { Material: 'Steel' }, s: 16 },
		{ t: 'Casserole Hot Pot 2.5L', c: 'Kitchen & Dining', p: 1250, was: 1500, spec: { Material: 'Steel' }, s: 26 },
		{ t: 'Spice Rack Organiser', c: 'Kitchen & Dining', p: 780, spec: { Material: 'Plastic' }, s: 38 },

		{ t: 'Cotton Bedsheet Double', c: 'Bedding & Bath', p: 1650, was: 1950, opt: ['Size', ['Single', 'Double', 'King']], s: 32 },
		{ t: 'Comforter Winter Double', c: 'Bedding & Bath', p: 3400, opt: ['Size', ['Single', 'Double']], s: 15 },
		{ t: 'Pillow Pair Fibre Filled', c: 'Bedding & Bath', p: 890, s: 48 },
		{ t: 'Mosquito Net Double', c: 'Bedding & Bath', p: 1150, opt: ['Size', ['Single', 'Double', 'King']], s: 36 },
		{ t: 'Bath Towel Cotton', c: 'Bedding & Bath', p: 620, was: 750, opt: ['Colour', ['White', 'Grey', 'Navy', 'Teal']], sw: ['#f0ece4', '#6b6f76', '#243a5e', '#226068'], s: 60 },
		{ t: 'Hand Towel Set of 4', c: 'Bedding & Bath', p: 480, s: 52 },
		{ t: 'Bath Mat Anti Slip', c: 'Bedding & Bath', p: 550, s: 42 },
		{ t: 'Blanket Fleece', c: 'Bedding & Bath', p: 1450, opt: ['Size', ['Single', 'Double']], s: 24 },
		{ t: 'Mattress Protector', c: 'Bedding & Bath', p: 1250, opt: ['Size', ['Single', 'Double']], s: 20 },

		{ t: 'Study Table with Drawer', c: 'Furniture', p: 6500, was: 7500, spec: { Material: 'Engineered Wood' }, s: 8 },
		{ t: 'Office Chair Mesh Back', c: 'Furniture', p: 8900, spec: { Material: 'Mesh' }, s: 6 },
		{ t: 'Bookshelf 5 Tier', c: 'Furniture', p: 5200, spec: { Material: 'Engineered Wood' }, s: 10 },
		{ t: 'Plastic Chair Set of 4', c: 'Furniture', p: 3200, spec: { Material: 'Plastic' }, s: 18 },
		{ t: 'Shoe Rack 4 Tier', c: 'Furniture', p: 2400, was: 2800, spec: { Material: 'Steel' }, s: 22 },
		{ t: 'Folding Dining Table', c: 'Furniture', p: 7800, spec: { Material: 'Engineered Wood' }, s: 5 },
		{ t: 'Bedside Table', c: 'Furniture', p: 2900, spec: { Material: 'Engineered Wood' }, s: 14 },
		{ t: 'Wardrobe 2 Door', c: 'Furniture', p: 14500, spec: { Material: 'Engineered Wood' }, s: 3 },

		{ t: 'Wall Clock Silent', c: 'Home Decor', p: 850, s: 34 },
		{ t: 'Photo Frame Set of 6', c: 'Home Decor', p: 1150, was: 1400, s: 26 },
		{ t: 'Artificial Plant with Pot', c: 'Home Decor', p: 720, s: 40 },
		{ t: 'Table Lamp', c: 'Home Decor', p: 1450, s: 20 },
		{ t: 'Wall Art Canvas Set of 3', c: 'Home Decor', p: 1850, s: 16 },
		{ t: 'Curtain Pair Blackout', c: 'Home Decor', p: 2400, was: 2900, opt: ['Colour', ['Beige', 'Grey', 'Navy']], sw: ['#d8c9ad', '#6b6f76', '#243a5e'], s: 24 },
		{ t: 'Floor Rug 4x6 ft', c: 'Home Decor', p: 3200, s: 12 },
		{ t: 'Prayer Mat Velvet', c: 'Home Decor', p: 950, s: 46 },
		{ t: 'Decorative Vase Ceramic', c: 'Home Decor', p: 680, s: 28 },
		{ t: 'Fairy String Lights 10m', c: 'Home Decor', p: 420, s: 64 },

		{ t: 'Storage Box Set of 3', c: 'Storage & Organisation', p: 950, was: 1150, s: 38 },
		{ t: 'Laundry Basket Foldable', c: 'Storage & Organisation', p: 620, s: 44 },
		{ t: 'Under Bed Storage Bag', c: 'Storage & Organisation', p: 480, s: 52 },
		{ t: 'Wardrobe Organiser Set', c: 'Storage & Organisation', p: 780, s: 36 },
		{ t: 'Vacuum Storage Bag Pack of 5', c: 'Storage & Organisation', p: 850, s: 30 },
		{ t: 'Kitchen Trolley 3 Tier', c: 'Storage & Organisation', p: 2200, s: 14 },
		{ t: 'Wall Hook Set of 6', c: 'Storage & Organisation', p: 280, s: 80 },
		{ t: 'Airtight Container Set of 6', c: 'Storage & Organisation', p: 1150, was: 1350, s: 32 },

		{ t: 'Floor Cleaner 1L', c: 'Cleaning', p: 320, s: 90 },
		{ t: 'Dishwash Liquid 500ml', c: 'Cleaning', p: 180, s: 120 },
		{ t: 'Detergent Powder 1kg', c: 'Cleaning', p: 240, was: 280, s: 110 },
		{ t: 'Toilet Cleaner 500ml', c: 'Cleaning', p: 165, s: 95 },
		{ t: 'Glass Cleaner Spray', c: 'Cleaning', p: 210, s: 66 },
		{ t: 'Microfibre Cloth Pack of 5', c: 'Cleaning', p: 350, s: 58 },
		{ t: 'Spin Mop with Bucket', c: 'Cleaning', p: 1650, was: 1950, s: 18 },
		{ t: 'Broom and Dustpan Set', c: 'Cleaning', p: 420, s: 48 },
		{ t: 'Dustbin 20L Pedal', c: 'Cleaning', p: 780, s: 26 }
	],
	hero: {
		heading: 'Set up the whole flat in one order',
		subheading: 'Kitchen, bedding, furniture and storage — delivered and carried up the stairs.',
		cta: 'Shop kitchen'
	},
	usps: [
		{ title: 'Carried upstairs', body: 'No lift, no problem' },
		{ title: 'Assembled free', body: 'On all furniture' },
		{ title: 'Cash on delivery', body: 'All 64 districts' },
		{ title: '7 day return', body: 'Unused and boxed' }
	],
	faq: [
		{ q: 'Do you assemble furniture?', a: 'Yes, free inside Dhaka. Outside Dhaka the item ships flat-packed with instructions and a helpline number.' },
		{ q: 'What if there is no lift in my building?', a: 'The rider carries it up to the fifth floor at no extra charge. Above that we agree a small fee before dispatch.' },
		{ q: 'Can I return something?', a: 'Within 7 days if it is unused and in the original box. Assembled furniture cannot be returned unless it is faulty.' },
		{ q: 'How long does delivery take?', a: 'Small items go next day inside Dhaka. Furniture takes three to five days because it ships by truck.' }
	],
	quotes: [
		{ quote: 'Furniture came assembled and they took the packaging away with them.', name: 'Kamrul H.' },
		{ quote: 'Bought the whole kitchen set for a new flat. One delivery, one payment.', name: 'Sumaiya T.' },
		{ quote: 'Carried a wardrobe to the fourth floor without complaining. Tipped them.', name: 'Rakib M.' }
	],
	promo: { heading: 'New home offer ends in', subheading: 'Free assembly and 15% off furniture' },
	meta: {
		title: 'Ghor Shonshar — kitchen, bedding, furniture and decor',
		description: 'Kitchen, bedding, furniture and storage delivered and assembled. Cash on delivery across Bangladesh.'
	}
};
