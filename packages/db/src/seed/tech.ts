import type { Vertical } from './types.ts';

export const tech: Vertical = {
	key: 'tech',
	region: 'south-asia',
	currency: 'BDT',
	locale: 'bn',
	country: 'BD',
	shop: 'Jontro',
	categories: ['Laptops', 'Smartphones', 'Monitors', 'Audio', 'Storage & Components', 'Accessories'],
	units: { RAM: 'GB', Screen: 'inch', Battery: 'mAh' },
	products: [
		{ t: 'Acer Aspire 3 A315', c: 'Laptops', p: 54500, was: 58000, spec: { RAM: '8', Processor: 'Core i5', Storage: '512GB SSD', Screen: '15.6', Brand: 'Acer' }, s: 6 },
		{ t: 'Asus VivoBook 15 X1504', c: 'Laptops', p: 62900, spec: { RAM: '16', Processor: 'Core i5', Storage: '512GB SSD', Screen: '15.6', Brand: 'Asus' }, s: 4 },
		{ t: 'HP Pavilion 14-dv', c: 'Laptops', p: 78900, was: 84000, spec: { RAM: '16', Processor: 'Core i7', Storage: '1TB SSD', Screen: '14', Brand: 'HP' }, s: 3 },
		{ t: 'Lenovo IdeaPad Slim 3', c: 'Laptops', p: 49900, spec: { RAM: '8', Processor: 'Ryzen 5', Storage: '256GB SSD', Screen: '15.6', Brand: 'Lenovo' }, s: 8 },
		{ t: 'Dell Inspiron 15 3520', c: 'Laptops', p: 59900, spec: { RAM: '8', Processor: 'Core i5', Storage: '512GB SSD', Screen: '15.6', Brand: 'Dell' }, s: 5 },
		{ t: 'MacBook Air M2', c: 'Laptops', p: 135000, spec: { RAM: '16', Processor: 'Apple M2', Storage: '512GB SSD', Screen: '13.6', Brand: 'Apple' }, s: 2 },
		{ t: 'Asus TUF Gaming F15', c: 'Laptops', p: 112000, was: 119000, spec: { RAM: '16', Processor: 'Core i7', Storage: '1TB SSD', Screen: '15.6', Brand: 'Asus' }, s: 3 },
		{ t: 'HP Victus 15', c: 'Laptops', p: 98000, spec: { RAM: '16', Processor: 'Ryzen 7', Storage: '512GB SSD', Screen: '15.6', Brand: 'HP' }, s: 4 },
		{ t: 'Lenovo ThinkPad E14', c: 'Laptops', p: 89500, spec: { RAM: '16', Processor: 'Core i5', Storage: '512GB SSD', Screen: '14', Brand: 'Lenovo' }, s: 5 },
		{ t: 'MacBook Pro 14 M3', c: 'Laptops', p: 215000, spec: { RAM: '18', Processor: 'Apple M3', Storage: '512GB SSD', Screen: '14.2', Brand: 'Apple' }, s: 1 },
		{ t: 'Acer Swift Go 14', c: 'Laptops', p: 84000, was: 90000, spec: { RAM: '16', Processor: 'Core i5', Storage: '512GB SSD', Screen: '14', Brand: 'Acer' }, s: 4 },
		{ t: 'Walton Tamarind Laptop', c: 'Laptops', p: 42500, spec: { RAM: '8', Processor: 'Celeron', Storage: '256GB SSD', Screen: '14', Brand: 'Walton' }, s: 10 },

		{ t: 'Samsung Galaxy A55 5G', c: 'Smartphones', p: 48000, was: 52000, opt: ['Storage', ['128GB', '256GB']], spec: { RAM: '8', Battery: '5000', Screen: '6.6', Brand: 'Samsung' }, s: 9 },
		{ t: 'Xiaomi Redmi Note 13 Pro', c: 'Smartphones', p: 32500, opt: ['Storage', ['128GB', '256GB']], spec: { RAM: '8', Battery: '5100', Screen: '6.67', Brand: 'Xiaomi' }, s: 14 },
		{ t: 'Realme 12 Pro', c: 'Smartphones', p: 36900, opt: ['Storage', ['128GB', '256GB']], spec: { RAM: '8', Battery: '5000', Screen: '6.7', Brand: 'Realme' }, s: 11 },
		{ t: 'Infinix Note 40', c: 'Smartphones', p: 24500, was: 27000, opt: ['Storage', ['128GB', '256GB']], spec: { RAM: '8', Battery: '5000', Screen: '6.78', Brand: 'Infinix' }, s: 18 },
		{ t: 'Samsung Galaxy S24', c: 'Smartphones', p: 128000, opt: ['Storage', ['256GB', '512GB']], spec: { RAM: '8', Battery: '4000', Screen: '6.2', Brand: 'Samsung' }, s: 3 },
		{ t: 'iPhone 15', c: 'Smartphones', p: 145000, opt: ['Storage', ['128GB', '256GB', '512GB']], spec: { RAM: '6', Battery: '3349', Screen: '6.1', Brand: 'Apple' }, s: 4 },
		{ t: 'Tecno Spark 20', c: 'Smartphones', p: 16500, opt: ['Storage', ['128GB', '256GB']], spec: { RAM: '8', Battery: '5000', Screen: '6.6', Brand: 'Tecno' }, s: 26 },
		{ t: 'Vivo Y28', c: 'Smartphones', p: 21900, was: 23500, opt: ['Storage', ['128GB']], spec: { RAM: '6', Battery: '6000', Screen: '6.68', Brand: 'Vivo' }, s: 20 },
		{ t: 'Oppo A78', c: 'Smartphones', p: 27500, opt: ['Storage', ['128GB', '256GB']], spec: { RAM: '8', Battery: '5000', Screen: '6.56', Brand: 'Oppo' }, s: 12 },
		{ t: 'Symphony Innova 30', c: 'Smartphones', p: 11900, opt: ['Storage', ['64GB', '128GB']], spec: { RAM: '4', Battery: '5000', Screen: '6.6', Brand: 'Symphony' }, s: 32 },

		{ t: 'Dell 24 inch IPS Monitor', c: 'Monitors', p: 21500, was: 23500, spec: { Screen: '24', Panel: 'IPS', Refresh: '75Hz', Brand: 'Dell' }, s: 8 },
		{ t: 'Samsung 27 inch Curved', c: 'Monitors', p: 32000, spec: { Screen: '27', Panel: 'VA', Refresh: '75Hz', Brand: 'Samsung' }, s: 6 },
		{ t: 'LG UltraGear 24 Gaming', c: 'Monitors', p: 28500, spec: { Screen: '24', Panel: 'IPS', Refresh: '144Hz', Brand: 'LG' }, s: 5 },
		{ t: 'Asus ProArt 27 4K', c: 'Monitors', p: 72000, was: 78000, spec: { Screen: '27', Panel: 'IPS', Refresh: '60Hz', Brand: 'Asus' }, s: 2 },
		{ t: 'HP 22 inch Full HD', c: 'Monitors', p: 15900, spec: { Screen: '22', Panel: 'IPS', Refresh: '75Hz', Brand: 'HP' }, s: 12 },
		{ t: 'Walton 19 inch Monitor', c: 'Monitors', p: 9500, spec: { Screen: '19', Panel: 'TN', Refresh: '60Hz', Brand: 'Walton' }, s: 16 },

		{ t: 'Sony WH-1000XM5 Headphones', c: 'Audio', p: 42000, was: 46000, spec: { Type: 'Over-ear', Wireless: 'Yes', Brand: 'Sony' }, s: 4 },
		{ t: 'JBL Tune 520BT', c: 'Audio', p: 6500, spec: { Type: 'On-ear', Wireless: 'Yes', Brand: 'JBL' }, s: 18 },
		{ t: 'Apple AirPods Pro 2', c: 'Audio', p: 32000, spec: { Type: 'In-ear', Wireless: 'Yes', Brand: 'Apple' }, s: 6 },
		{ t: 'Soundcore Life P3', c: 'Audio', p: 7900, was: 8900, spec: { Type: 'In-ear', Wireless: 'Yes', Brand: 'Anker' }, s: 22 },
		{ t: 'Logitech H390 Headset', c: 'Audio', p: 3200, spec: { Type: 'Over-ear', Wireless: 'No', Brand: 'Logitech' }, s: 28 },
		{ t: 'JBL Flip 6 Speaker', c: 'Audio', p: 14500, spec: { Type: 'Speaker', Wireless: 'Yes', Brand: 'JBL' }, s: 9 },
		{ t: 'Xiaomi Redmi Buds 5', c: 'Audio', p: 3900, spec: { Type: 'In-ear', Wireless: 'Yes', Brand: 'Xiaomi' }, s: 34 },
		{ t: 'Havit Gaming Headset H2002d', c: 'Audio', p: 2400, was: 2900, spec: { Type: 'Over-ear', Wireless: 'No', Brand: 'Havit' }, s: 26 },

		{ t: 'Samsung 980 NVMe SSD', c: 'Storage & Components', p: 9500, opt: ['Capacity', ['500GB', '1TB', '2TB']], spec: { Type: 'NVMe SSD', Brand: 'Samsung' }, s: 15 },
		{ t: 'WD Blue SATA SSD', c: 'Storage & Components', p: 6200, opt: ['Capacity', ['500GB', '1TB']], spec: { Type: 'SATA SSD', Brand: 'WD' }, s: 20 },
		{ t: 'Seagate 2TB External HDD', c: 'Storage & Components', p: 8900, was: 9800, spec: { Type: 'External HDD', Brand: 'Seagate' }, s: 14 },
		{ t: 'Corsair Vengeance 16GB DDR4', c: 'Storage & Components', p: 5400, spec: { Type: 'RAM', Brand: 'Corsair' }, s: 18 },
		{ t: 'SanDisk Ultra 128GB Pendrive', c: 'Storage & Components', p: 1450, spec: { Type: 'USB Drive', Brand: 'SanDisk' }, s: 45 },
		{ t: 'Kingston 64GB microSD', c: 'Storage & Components', p: 950, was: 1150, spec: { Type: 'microSD', Brand: 'Kingston' }, s: 52 },

		{ t: 'Logitech MX Master 3S Mouse', c: 'Accessories', p: 12500, spec: { Type: 'Mouse', Brand: 'Logitech' }, s: 10 },
		{ t: 'Keychron K2 Mechanical Keyboard', c: 'Accessories', p: 11900, was: 13000, spec: { Type: 'Keyboard', Brand: 'Keychron' }, s: 7 },
		{ t: 'A4Tech Wired Mouse', c: 'Accessories', p: 750, spec: { Type: 'Mouse', Brand: 'A4Tech' }, s: 60 },
		{ t: 'Anker 20000mAh Power Bank', c: 'Accessories', p: 4200, spec: { Type: 'Power Bank', Brand: 'Anker' }, s: 24 },
		{ t: 'Baseus 65W GaN Charger', c: 'Accessories', p: 3400, was: 3900, spec: { Type: 'Charger', Brand: 'Baseus' }, s: 30 },
		{ t: 'USB-C to HDMI Hub 6-in-1', c: 'Accessories', p: 2800, spec: { Type: 'Hub', Brand: 'Ugreen' }, s: 26 },
		{ t: 'Laptop Cooling Pad', c: 'Accessories', p: 1650, spec: { Type: 'Cooling', Brand: 'Havit' }, s: 22 },
		{ t: 'Laptop Backpack 15.6 inch', c: 'Accessories', p: 2200, was: 2600, spec: { Type: 'Bag', Brand: 'Targus' }, s: 28 },
		{ t: 'Webcam 1080p', c: 'Accessories', p: 3100, spec: { Type: 'Webcam', Brand: 'Logitech' }, s: 16 },
		{ t: 'UPS 650VA', c: 'Accessories', p: 5800, spec: { Type: 'UPS', Brand: 'Power Guard' }, s: 12 }
	],
	hero: {
		heading: 'Laptops and phones with a real warranty',
		subheading: 'Official warranty, EMI available, and a receipt you can actually claim against.',
		cta: 'Shop laptops'
	},
	usps: [
		{ title: 'Official warranty', body: 'Not grey market' },
		{ title: '0% EMI', body: 'Up to 12 months' },
		{ title: 'Open box check', body: 'Inspect before you pay' },
		{ title: 'Service centre', body: 'Walk in for repairs' }
	],
	faq: [
		{ q: 'Is the warranty official?', a: 'Yes. Every laptop and phone is imported through the official channel and carries the brand warranty. The invoice we give you is what you claim against.' },
		{ q: 'Can I check the product before paying?', a: 'Yes. Open box delivery inside Dhaka — the rider waits while you check, and you can refuse it there.' },
		{ q: 'Do you have EMI?', a: '0% EMI up to 12 months on most credit cards. Choose EMI at checkout and the bank confirms by SMS.' },
		{ q: 'What if it develops a fault?', a: 'Bring it to our service centre or courier it to us. Warranty repairs are free; we tell you the cost first for anything else.' }
	],
	quotes: [
		{ quote: 'Open box delivery is why I ordered here instead of the market.', name: 'Tanvir I.' },
		{ quote: 'EMI went through in ten minutes and the laptop came the same evening.', name: 'Sabbir A.' },
		{ quote: 'Had a keyboard fault. Replaced under warranty without any argument.', name: 'Nadia S.' }
	],
	announcement: 'Official warranty · 0% EMI up to 12 months',
	supportHours: 'Sat–Thu, 10am–7pm',
	promo: { heading: 'Back to campus offer ends in', subheading: 'Free bag and mouse with every laptop' },
	meta: {
		title: 'Jontro — laptops, phones and accessories with official warranty',
		description: 'Laptops, smartphones and accessories with official warranty, 0% EMI and open box delivery across Bangladesh.'
	}
};
