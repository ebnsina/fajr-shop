import type { Vertical } from './types.ts';

export const gulfTech: Vertical = {
	key: 'gulf-tech',
	shop: 'Barq',
	region: 'middle-east',
	currency: 'AED',
	locale: 'en',
	country: 'AE',
	categories: ['Smartphones', 'Laptops', 'Audio', 'Smart Home', 'Gaming', 'Accessories'],
	units: { RAM: 'GB', Screen: 'inch', Battery: 'mAh' },
	products: [
		{ t: 'iPhone 16 Pro', c: 'Smartphones', p: 4699, opt: ['Storage', ['256GB', '512GB', '1TB']], spec: { RAM: '8', Battery: '3582', Screen: '6.3', Brand: 'Apple' }, s: 12 },
		{ t: 'Samsung Galaxy S25 Ultra', c: 'Smartphones', p: 4999, was: 5299, opt: ['Storage', ['256GB', '512GB']], spec: { RAM: '12', Battery: '5000', Screen: '6.9', Brand: 'Samsung' }, s: 9 },
		{ t: 'iPhone 16', c: 'Smartphones', p: 3299, opt: ['Storage', ['128GB', '256GB']], spec: { RAM: '8', Battery: '3561', Screen: '6.1', Brand: 'Apple' }, s: 18 },
		{ t: 'Google Pixel 9 Pro', c: 'Smartphones', p: 3899, opt: ['Storage', ['256GB', '512GB']], spec: { RAM: '16', Battery: '4700', Screen: '6.3', Brand: 'Google' }, s: 7 },
		{ t: 'Samsung Galaxy A56', c: 'Smartphones', p: 1499, was: 1699, opt: ['Storage', ['128GB', '256GB']], spec: { RAM: '8', Battery: '5000', Screen: '6.7', Brand: 'Samsung' }, s: 24 },
		{ t: 'Honor Magic 7 Lite', c: 'Smartphones', p: 1099, opt: ['Storage', ['256GB']], spec: { RAM: '8', Battery: '6600', Screen: '6.78', Brand: 'Honor' }, s: 20 },

		{ t: 'MacBook Pro 14 M4', c: 'Laptops', p: 7999, spec: { RAM: '24', Processor: 'Apple M4', Storage: '512GB SSD', Screen: '14.2', Brand: 'Apple' }, s: 5 },
		{ t: 'MacBook Air 15 M4', c: 'Laptops', p: 5299, was: 5699, spec: { RAM: '16', Processor: 'Apple M4', Storage: '512GB SSD', Screen: '15.3', Brand: 'Apple' }, s: 8 },
		{ t: 'Dell XPS 14', c: 'Laptops', p: 6499, spec: { RAM: '16', Processor: 'Core Ultra 7', Storage: '1TB SSD', Screen: '14.5', Brand: 'Dell' }, s: 6 },
		{ t: 'Asus ROG Zephyrus G14', c: 'Laptops', p: 7299, spec: { RAM: '32', Processor: 'Ryzen 9', Storage: '1TB SSD', Screen: '14', Brand: 'Asus' }, s: 4 },
		{ t: 'Lenovo Yoga Slim 7', c: 'Laptops', p: 3799, was: 4200, spec: { RAM: '16', Processor: 'Core Ultra 5', Storage: '512GB SSD', Screen: '14', Brand: 'Lenovo' }, s: 11 },
		{ t: 'HP Spectre x360', c: 'Laptops', p: 5499, spec: { RAM: '16', Processor: 'Core Ultra 7', Storage: '1TB SSD', Screen: '14', Brand: 'HP' }, s: 5 },

		{ t: 'AirPods Pro 3', c: 'Audio', p: 999, spec: { Type: 'In-ear', Wireless: 'Yes', Brand: 'Apple' }, s: 26 },
		{ t: 'Sony WH-1000XM6', c: 'Audio', p: 1699, was: 1899, spec: { Type: 'Over-ear', Wireless: 'Yes', Brand: 'Sony' }, s: 12 },
		{ t: 'Bose QuietComfort Ultra', c: 'Audio', p: 1599, spec: { Type: 'Over-ear', Wireless: 'Yes', Brand: 'Bose' }, s: 10 },
		{ t: 'JBL Charge 6', c: 'Audio', p: 749, spec: { Type: 'Speaker', Wireless: 'Yes', Brand: 'JBL' }, s: 18 },
		{ t: 'Marshall Emberton III', c: 'Audio', p: 649, was: 749, spec: { Type: 'Speaker', Wireless: 'Yes', Brand: 'Marshall' }, s: 14 },
		{ t: 'Samsung Galaxy Buds 3 Pro', c: 'Audio', p: 799, spec: { Type: 'In-ear', Wireless: 'Yes', Brand: 'Samsung' }, s: 22 },

		{ t: 'Apple TV 4K', c: 'Smart Home', p: 599, spec: { Type: 'Streaming', Brand: 'Apple' }, s: 16 },
		{ t: 'Amazon Echo Show 8', c: 'Smart Home', p: 549, was: 629, spec: { Type: 'Smart Display', Brand: 'Amazon' }, s: 20 },
		{ t: 'Philips Hue Starter Kit', c: 'Smart Home', p: 799, spec: { Type: 'Lighting', Brand: 'Philips' }, s: 13 },
		{ t: 'Dyson V15 Detect', c: 'Smart Home', p: 2899, spec: { Type: 'Vacuum', Brand: 'Dyson' }, s: 6 },
		{ t: 'Ecovacs Deebot X5', c: 'Smart Home', p: 2499, was: 2799, spec: { Type: 'Robot Vacuum', Brand: 'Ecovacs' }, s: 7 },
		{ t: 'Ring Video Doorbell 4', c: 'Smart Home', p: 749, spec: { Type: 'Security', Brand: 'Ring' }, s: 15 },

		{ t: 'PlayStation 5 Pro', c: 'Gaming', p: 3299, spec: { Type: 'Console', Brand: 'Sony' }, s: 5 },
		{ t: 'Xbox Series X', c: 'Gaming', p: 2199, was: 2399, spec: { Type: 'Console', Brand: 'Microsoft' }, s: 8 },
		{ t: 'Nintendo Switch 2', c: 'Gaming', p: 1899, spec: { Type: 'Console', Brand: 'Nintendo' }, s: 10 },
		{ t: 'DualSense Edge Controller', c: 'Gaming', p: 849, spec: { Type: 'Controller', Brand: 'Sony' }, s: 14 },
		{ t: 'Razer BlackWidow V4', c: 'Gaming', p: 749, spec: { Type: 'Keyboard', Brand: 'Razer' }, s: 12 },
		{ t: 'Logitech G Pro X Superlight 2', c: 'Gaming', p: 599, was: 679, spec: { Type: 'Mouse', Brand: 'Logitech' }, s: 18 },

		{ t: 'Anker 737 Power Bank', c: 'Accessories', p: 449, spec: { Type: 'Power Bank', Brand: 'Anker' }, s: 24 },
		{ t: 'Apple 30W USB-C Charger', c: 'Accessories', p: 149, spec: { Type: 'Charger', Brand: 'Apple' }, s: 40 },
		{ t: 'Belkin 3-in-1 MagSafe Stand', c: 'Accessories', p: 599, was: 699, spec: { Type: 'Charger', Brand: 'Belkin' }, s: 16 },
		{ t: 'Samsung T9 Portable SSD 2TB', c: 'Accessories', p: 899, spec: { Type: 'Storage', Brand: 'Samsung' }, s: 12 },
		{ t: 'Apple Watch Band Sport Loop', c: 'Accessories', p: 199, spec: { Type: 'Band', Brand: 'Apple' }, s: 34 },
		{ t: 'UGREEN 100W GaN Charger', c: 'Accessories', p: 279, spec: { Type: 'Charger', Brand: 'UGREEN' }, s: 28 }
	],
	hero: {
		heading: 'Same-day in Dubai. Genuine warranty.',
		subheading: 'Phones, laptops and audio with UAE warranty — pay in four with Tabby.',
		cta: 'Shop smartphones'
	},
	usps: [
		{ title: 'Same-day in Dubai', body: 'Order before 2pm' },
		{ title: 'UAE warranty', body: 'Not parallel import' },
		{ title: 'Pay in 4', body: 'Tabby and Tamara' },
		{ title: 'Prices include VAT', body: 'Nothing added at checkout' }
	],
	faq: [
		{ q: 'Is the warranty valid in the UAE?', a: 'Yes. Everything is sourced through the official regional distributor, so the warranty is honoured at any authorised service centre here.' },
		{ q: 'How fast is delivery?', a: 'Same day in Dubai and Sharjah for orders before 2pm. Next day everywhere else in the Emirates.' },
		{ q: 'Can I split the payment?', a: 'Tabby and Tamara both split any order into four interest-free payments. Apple Pay and mada are also accepted.' },
		{ q: 'What if I change my mind?', a: 'Fourteen days to return, free, provided the seal is intact. Opened electronics can be exchanged if faulty.' }
	],
	quotes: [
		{ quote: 'Ordered a MacBook at 11am, it arrived in Dubai Marina by 6pm.', name: 'Omar S., Dubai' },
		{ quote: 'Genuine UAE warranty, and the invoice was accepted at the service centre without question.', name: 'Khalid M., Abu Dhabi' },
		{ quote: 'Split a PS5 over four Tabby payments. No interest, no paperwork.', name: 'Yousef A., Ajman' }
	],
	promo: { heading: 'Gitex week ends in', subheading: 'Up to 20% off laptops and audio' },
	announcement: 'Same-day delivery in Dubai · UAE warranty · Pay in 4 with Tabby',
	supportHours: 'Sun–Fri, 9am–8pm GST',
	meta: {
		title: 'Barq — phones, laptops and audio with UAE warranty',
		description: 'Smartphones, laptops, audio and smart home with genuine UAE warranty. Same-day delivery in Dubai, pay in four with Tabby.'
	}
};
