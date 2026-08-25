import type { Vertical } from './types.ts';

export const gulfGrocery: Vertical = {
	key: 'gulf-grocery',
	shop: 'Souq Yawmi',
	region: 'middle-east',
	currency: 'AED',
	locale: 'en',
	country: 'AE',
	categories: ['Fresh Produce', 'Meat & Poultry', 'Dates & Nuts', 'Pantry Staples', 'Bakery & Dairy', 'Beverages'],
	products: [
		{ t: 'طماطم طازجة', c: 'Fresh Produce', p: 6, opt: ['Pack', ['500 g', '1 kg']], spec: { Origin: 'UAE', Type: 'Fresh' }, s: 90 },
		{ t: 'Cucumber Local', c: 'Fresh Produce', p: 5, opt: ['Pack', ['500 g', '1 kg']], spec: { Origin: 'UAE', Type: 'Fresh' }, s: 85 },
		{ t: 'Avocado Hass', c: 'Fresh Produce', p: 18, was: 22, opt: ['Pack', ['2 pcs', '4 pcs']], spec: { Origin: 'Kenya', Type: 'Fresh' }, s: 44 },
		{ t: 'Bananas', c: 'Fresh Produce', p: 8, opt: ['Pack', ['1 kg']], spec: { Origin: 'Philippines', Type: 'Fresh' }, s: 70 },
		{ t: 'Baby Spinach', c: 'Fresh Produce', p: 12, spec: { Origin: 'UAE', Type: 'Organic' }, s: 38 },
		{ t: 'Lemons', c: 'Fresh Produce', p: 9, opt: ['Pack', ['500 g', '1 kg']], spec: { Origin: 'Turkey', Type: 'Fresh' }, s: 55 },
		{ t: 'Mixed Salad Leaves', c: 'Fresh Produce', p: 14, was: 17, spec: { Origin: 'UAE', Type: 'Organic' }, s: 32 },

		{ t: 'Australian Lamb Chops', c: 'Meat & Poultry', p: 68, opt: ['Pack', ['500 g', '1 kg']], spec: { Origin: 'Australia', Certification: 'Halal' }, s: 22 },
		{ t: 'دجاج طازج كامل', c: 'Meat & Poultry', p: 24, was: 29, spec: { Origin: 'UAE', Certification: 'Halal' }, s: 40 },
		{ t: 'Chicken Breast Fillet', c: 'Meat & Poultry', p: 32, opt: ['Pack', ['500 g', '1 kg']], spec: { Origin: 'UAE', Certification: 'Halal' }, s: 46 },
		{ t: 'Beef Mince', c: 'Meat & Poultry', p: 38, opt: ['Pack', ['500 g', '1 kg']], spec: { Origin: 'Brazil', Certification: 'Halal' }, s: 30 },
		{ t: 'Salmon Fillet Norwegian', c: 'Meat & Poultry', p: 89, was: 105, spec: { Origin: 'Norway', Certification: 'Fresh' }, s: 14 },
		{ t: 'Hammour Fillet', c: 'Meat & Poultry', p: 76, spec: { Origin: 'UAE', Certification: 'Fresh' }, s: 12 },

		{ t: 'تمر مجدول فاخر', c: 'Dates & Nuts', p: 85, was: 100, opt: ['Pack', ['500 g', '1 kg']], spec: { Origin: 'Saudi Arabia', Type: 'Medjool' }, s: 36 },
		{ t: 'Khalas Dates', c: 'Dates & Nuts', p: 48, opt: ['Pack', ['500 g', '1 kg']], spec: { Origin: 'UAE', Type: 'Khalas' }, s: 42 },
		{ t: 'Ajwa Dates Madinah', c: 'Dates & Nuts', p: 165, opt: ['Pack', ['500 g', '1 kg']], spec: { Origin: 'Saudi Arabia', Type: 'Ajwa' }, s: 18 },
		{ t: 'Mixed Nuts Roasted', c: 'Dates & Nuts', p: 72, opt: ['Pack', ['250 g', '500 g']], spec: { Origin: 'Turkey', Type: 'Roasted' }, s: 28 },
		{ t: 'Pistachios Salted', c: 'Dates & Nuts', p: 95, was: 115, opt: ['Pack', ['250 g', '500 g']], spec: { Origin: 'Iran', Type: 'Roasted' }, s: 24 },
		{ t: 'Almonds Raw', c: 'Dates & Nuts', p: 58, opt: ['Pack', ['250 g', '500 g']], spec: { Origin: 'USA', Type: 'Raw' }, s: 34 },
		{ t: 'Date Gift Box Assorted', c: 'Dates & Nuts', p: 220, spec: { Origin: 'UAE', Type: 'Gift' }, s: 15 },

		{ t: 'أرز بسمتي فاخر', c: 'Pantry Staples', p: 42, opt: ['Pack', ['1 kg', '5 kg', '10 kg']], spec: { Origin: 'India', Type: 'Basmati' }, s: 60 },
		{ t: 'Extra Virgin Olive Oil', c: 'Pantry Staples', p: 68, was: 82, opt: ['Size', ['500 ml', '1 L']], spec: { Origin: 'Spain', Type: 'Olive Oil' }, s: 44 },
		{ t: 'Tahini Paste', c: 'Pantry Staples', p: 24, spec: { Origin: 'Lebanon', Type: 'Tahini' }, s: 38 },
		{ t: 'Chickpeas Dried', c: 'Pantry Staples', p: 16, opt: ['Pack', ['500 g', '1 kg']], spec: { Origin: 'Turkey', Type: 'Pulses' }, s: 50 },
		{ t: 'Freekeh', c: 'Pantry Staples', p: 28, opt: ['Pack', ['500 g', '1 kg']], spec: { Origin: 'Jordan', Type: 'Grain' }, s: 26 },
		{ t: 'Zaatar Blend', c: 'Pantry Staples', p: 22, opt: ['Pack', ['200 g', '500 g']], spec: { Origin: 'Palestine', Type: 'Spice' }, s: 46 },
		{ t: 'Rose Water', c: 'Pantry Staples', p: 18, spec: { Origin: 'Lebanon', Type: 'Flavouring' }, s: 40 },

		{ t: 'Arabic Bread Large', c: 'Bakery & Dairy', p: 6, spec: { Origin: 'UAE', Type: 'Bread' }, s: 80 },
		{ t: 'Croissant Butter 4 pcs', c: 'Bakery & Dairy', p: 22, was: 26, spec: { Origin: 'UAE', Type: 'Pastry' }, s: 34 },
		{ t: 'Laban Full Fat 1L', c: 'Bakery & Dairy', p: 9, spec: { Origin: 'UAE', Type: 'Dairy' }, s: 66 },
		{ t: 'Greek Yoghurt 500g', c: 'Bakery & Dairy', p: 16, spec: { Origin: 'Greece', Type: 'Dairy' }, s: 42 },
		{ t: 'Halloumi Cheese', c: 'Bakery & Dairy', p: 34, was: 39, spec: { Origin: 'Cyprus', Type: 'Cheese' }, s: 28 },
		{ t: 'Fresh Milk 2L', c: 'Bakery & Dairy', p: 14, spec: { Origin: 'UAE', Type: 'Dairy' }, s: 72 },
		{ t: 'Labneh 400g', c: 'Bakery & Dairy', p: 15, spec: { Origin: 'Lebanon', Type: 'Dairy' }, s: 48 },

		{ t: 'Arabic Coffee Ground', c: 'Beverages', p: 45, opt: ['Pack', ['250 g', '500 g']], spec: { Origin: 'Saudi Arabia', Type: 'Coffee' }, s: 36 },
		{ t: 'Karak Tea Mix', c: 'Beverages', p: 28, spec: { Origin: 'UAE', Type: 'Tea' }, s: 44 },
		{ t: 'Moroccan Mint Tea', c: 'Beverages', p: 32, was: 38, spec: { Origin: 'Morocco', Type: 'Tea' }, s: 30 },
		{ t: 'Sparkling Water 6 pack', c: 'Beverages', p: 18, spec: { Origin: 'France', Type: 'Water' }, s: 58 },
		{ t: 'Fresh Orange Juice 1L', c: 'Beverages', p: 22, spec: { Origin: 'UAE', Type: 'Juice' }, s: 40 },
		{ t: 'Jallab Syrup', c: 'Beverages', p: 26, spec: { Origin: 'Lebanon', Type: 'Syrup' }, s: 24 }
	],
	hero: {
		heading: 'Your groceries, in two hours',
		subheading: 'Fresh produce, halal meat and pantry staples delivered across Dubai and Abu Dhabi.',
		cta: 'Shop fresh produce'
	},
	usps: [
		{ title: 'Two-hour delivery', body: 'Dubai and Abu Dhabi' },
		{ title: 'Halal certified', body: 'All meat and poultry' },
		{ title: 'Fresh or refunded', body: 'Checked at your door' },
		{ title: 'Prices include VAT', body: 'Nothing added at checkout' }
	],
	faq: [
		{ q: 'How fast is delivery?', a: 'Two-hour slots across Dubai and Abu Dhabi, and same-day everywhere else in the Emirates. You pick the slot at checkout.' },
		{ q: 'Is the meat halal?', a: 'Every meat and poultry item is halal certified, and the certificate origin is listed on each product page.' },
		{ q: 'What if something arrives not fresh?', a: 'Tell the driver at the door and it comes off the bill immediately. Nothing to post back, no form to fill in.' },
		{ q: 'Do you deliver during Ramadan?', a: 'Yes, with extended evening slots through iftar and suhoor. Order timings shift with the Hijri calendar each year.' }
	],
	quotes: [
		{ quote: 'Ordered at 4pm, everything arrived before 6pm and the salmon was properly cold.', name: 'Noura H., Dubai' },
		{ quote: 'The Medjool dates are the same ones I buy in the souq, without the drive.', name: 'Saeed A., Al Ain' },
		{ quote: 'One tomato pack looked tired and they took it off the bill at the door.', name: 'Layla M., Abu Dhabi' }
	],
	promo: { heading: 'Ramadan pantry offer ends in', subheading: 'Dates, nuts and staples bundled' },
	announcement: 'Two-hour delivery in Dubai and Abu Dhabi · All meat halal certified',
	supportHours: 'Every day, 7am–11pm GST',
	meta: {
		title: 'Souq Yawmi — groceries delivered in two hours across the UAE',
		description: 'Fresh produce, halal meat, dates and pantry staples delivered in two hours across Dubai and Abu Dhabi. Prices include VAT.'
	}
};
