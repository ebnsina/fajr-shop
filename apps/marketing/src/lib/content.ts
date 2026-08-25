// One source of truth for what the product does, what it will do, and what it costs. Two pages
// disagreeing about a price is how a merchant stops trusting the rest of the page.

export type Feature = { title: string; body: string; soon?: boolean };

/** What the shop does today. Operational first — that is the actual edge. */
export const OPERATIONS: Feature[] = [
	{
		title: 'COD fraud checking',
		body: 'Every order is scored against courier return history before it is accepted. High-risk numbers are asked to prepay instead of being refused, so you keep the sale and lose the risk.'
	},
	{
		title: 'Verification call queue',
		body: 'A real work queue, not a note field. Proven customers skip the call entirely, so your staff phone the orders that matter instead of all of them.'
	},
	{
		title: 'Courier routing by area',
		body: 'We track which courier actually delivers in each thana, from your own parcels, and send each order the way most likely to arrive. Nobody else can see your data.'
	},
	{
		title: 'COD reconciliation',
		body: 'Match a courier payout to the parcels it covers and see the gap immediately. This is the money most BD shops quietly lose.'
	}
];

export const STOREFRONT: Feature[] = [
	{
		title: 'One-page checkout, no account',
		body: 'Name, phone, address. Account creation is the biggest drop-off in BD checkout, so there is not one.'
	},
	{
		title: 'Bangla throughout',
		body: 'Bangla prices, Bangla SMS, and a Bangla admin for staff who work faster in it. Not a translation bolted on afterwards.'
	},
	{
		title: 'Built for slow connections',
		body: 'Under a second on a 3G Dhaka connection. Every image is served from a CDN and only the code a page needs is sent.'
	},
	{
		title: 'Drag-and-drop campaign pages',
		body: 'Build a landing page for an ad in ten minutes, schedule it to come down at midnight, and duplicate the one that converted.'
	}
];

export const RUNNING: Feature[] = [
	{
		title: 'Order tracking without a login',
		body: 'Customers check their own order with a code and their phone number, which takes the "where is my order?" load off Messenger.'
	},
	{
		title: 'SMS that people actually read',
		body: 'Order confirmed, on the way, delivered — in Bangla, through a local gateway at BDT 0.25 a message.'
	},
	{
		title: 'Facebook Conversions API',
		body: 'Purchases are sent server-side, so the conversions an ad blocker eats still reach your campaign.'
	},
	{
		title: 'Reports that do not flatter you',
		body: 'Return rate, courier performance, real margin, and cancelled orders excluded from revenue.'
	}
];

/** Phases 7–11 in the build plan. Dated only as loosely as they are known. */
export type RoadmapItem = { title: string; body: string; when: string };

export const ROADMAP: RoadmapItem[] = [
	{
		title: 'AI chat agent',
		body: 'Answers "where is my order?" on Messenger and WhatsApp, in Banglish, using your real order data. Starts as a draft-suggester your staff approve, then handles the safe questions on its own.',
		when: 'Next'
	},
	{
		title: 'WhatsApp order taking',
		body: 'Customers order in the chat they already use, and the order lands in the same queue with the same fraud check.',
		when: 'Next'
	},
	{
		title: 'Mobile app',
		body: 'Android first. Push notifications replace paid SMS for repeat customers, which is the whole reason to have one.',
		when: 'Later'
	},
	{
		title: 'Voice verification calls',
		body: 'Automated confirmation calls in Bangla for COD orders. Ships only if it confirms as reliably as your staff do.',
		when: 'Later'
	},
	{
		title: 'UAE and the Gulf',
		body: 'Same shop, Arabic and English, Gulf payment rails and couriers. The groundwork is already in place.',
		when: 'Later'
	},
	{
		title: 'Reseller commissions',
		body: 'Tracked links and payouts for the resellers who already sell your products on Facebook.',
		when: 'Later'
	}
];

// Pricing. Built up from what a merchant actually costs to serve rather than down from what
// Shopify charges.
export type Plan = {
	id: string;
	name: string;
	monthlyBdt: number;
	setupBdt: number;
	tagline: string;
	orders: string;
	sms: string;
	staff: string;
	support: string;
	includes: string[];
	featured?: boolean;
};

export const PLANS: Plan[] = [
	{
		id: 'starter',
		name: 'Starter',
		monthlyBdt: 4500,
		setupBdt: 25000,
		tagline: 'A shop that has outgrown a Facebook page.',
		orders: 'Up to 300 orders a month',
		sms: '500 SMS included',
		staff: '2 staff accounts',
		support: 'Email support, next working day',
		includes: [
			'Full storefront and admin',
			'COD, advance bKash, verification queue',
			'One courier integration',
			'Fraud checking on every order',
			'Campaign page builder',
			'Nightly backups'
		]
	},
	{
		id: 'growth',
		name: 'Growth',
		monthlyBdt: 9000,
		setupBdt: 45000,
		tagline: 'Where most shops sit. Enough volume that returns hurt.',
		orders: 'Up to 1,500 orders a month',
		sms: '2,000 SMS included',
		staff: '10 staff accounts',
		support: 'Phone and WhatsApp, same day',
		featured: true,
		includes: [
			'Everything in Starter',
			'All courier integrations, routed by delivery rate',
			'COD reconciliation',
			'Online payments via SSLCommerz',
			'Facebook Conversions API and product feed',
			'Abandoned cart recovery',
			'Customer segments and blacklist'
		]
	},
	{
		id: 'scale',
		name: 'Scale',
		monthlyBdt: 18000,
		setupBdt: 75000,
		tagline: 'High volume, or a catalog that needs its own machine.',
		orders: 'Unlimited orders',
		sms: '6,000 SMS included',
		staff: 'Unlimited staff',
		support: 'Priority, with a named contact',
		includes: [
			'Everything in Growth',
			'Your own server, not shared',
			'Custom theme work at a reduced rate',
			'Quarterly review of returns and courier performance',
			'Migration from Shopify or WooCommerce included'
		]
	}
];

/** Costs that scale with usage are billed with usage. That is what keeps the price honest. */
export const OVERAGES = [
	{ label: 'SMS beyond the bundle', price: 'BDT 0.35 each' },
	{ label: 'Fraud checks beyond 1 per order', price: 'BDT 2 each' },
	{ label: 'Orders beyond your plan', price: 'BDT 3 each' }
];

export const PRICING_FAQ = [
	{
		q: 'Why is there a setup fee?',
		a: 'Setting a shop up is real work: your own server, your domain, your courier and payment accounts, your catalog moved across, and training your staff. It is done once, by a person, and the fee covers that rather than being hidden in a higher monthly.'
	},
	{
		q: 'Do you take a percentage of sales?',
		a: 'No. A percentage of revenue means auditing your sales and chasing payments, which makes us a collections company instead of a software one. You pay a flat monthly fee and keep everything you sell.'
	},
	{
		q: 'Is there a free trial?',
		a: 'No, but there is a demo. Every shop is its own server with its own database, so a trial means provisioning and supporting a shop that may never open. We would rather spend that time on merchants who are serious, and charge less as a result.'
	},
	{
		q: 'What happens if I want to leave?',
		a: 'You get a full export of your products, customers and orders, and your database dump. It is your data. No notice period beyond the month you have paid for.'
	},
	{
		q: 'Who pays for SMS and delivery?',
		a: 'SMS bundles are included in the plan and overage is billed at cost plus a little. Courier charges are between you and the courier — we never sit in the middle of your money.'
	},
	{
		q: 'Can I change plans?',
		a: 'Any time, and it takes effect the next month. Nobody is upgraded automatically for having a good month.'
	}
];

/** Absolute base for canonical URLs and the sitemap. One site, one domain. */
export const SITE_URL = 'https://fajr.shop';

// Per-route title and description, rendered once by the layout into both the plain tags and
// their og:/twitter: twins.
export const META: Record<string, { title: string; description: string }> = {
	'/': {
		title: 'Fajr Shop — ecommerce for South Asia and the Gulf',
		description:
			'Cash on delivery, fraud checking, courier routing and COD reconciliation. Built for how South Asia and the Gulf actually sell.'
	},
	'/pricing': {
		title: 'Pricing — Fajr Shop',
		description:
			'Flat monthly pricing from BDT 4,500. No revenue share. Setup, couriers, fraud checking and support included.'
	},
	'/contact': {
		title: 'Book a demo — Fajr Shop',
		description: 'Twenty minutes on your own numbers. WhatsApp, phone or the form.'
	},
	'/demo': {
		title: 'Live demo shops — Fajr Shop',
		description: 'Six real storefronts, one per trade, seeded with a full catalogue. Pick the one closest to yours.'
	}
};

export type Demo = {
	key: string;
	region: 'south-asia' | 'middle-east';
	shop: string;
	label: string;
	tagline: string;
	// What this particular demo is meant to prove, rather than a feature list.
	shows: string[];
	products: number;
	theme: 'Fashion theme' | 'Tech theme' | 'Gulf theme';
};

// One seeded shop per vertical, so a merchant sees their own trade, not someone else's.
export const DEMOS: Demo[] = [
	{
		key: 'fashion', region: 'south-asia', shop: 'Neel Tanti', label: 'Fashion & clothing',
		tagline: 'Sarees, kurti and panjabi with colour and size variants.',
		shows: ['Colour swatches and size runs', 'Sold-out variants on the grid', 'Bangla product titles'],
		products: 52, theme: 'Fashion theme'
	},
	{
		key: 'kids', region: 'south-asia', shop: 'Choto Bela', label: 'Kids & baby',
		tagline: 'Clothes, toys and school supplies sold by age band.',
		shows: ['Age-band variants, not just sizes', 'Six categories on one menu', 'Exchange-heavy FAQ'],
		products: 54, theme: 'Fashion theme'
	},
	{
		key: 'grocery', region: 'south-asia', shop: 'Bazar Ghor', label: 'Grocery & bazar',
		tagline: 'Rice, oil, dal and spices priced by pack size.',
		shows: ['Pack-size pricing up to 50kg', 'Dense grid built for repeat orders', 'Filterable origin and type'],
		products: 57, theme: 'Tech theme'
	},
	{
		key: 'tech', region: 'south-asia', shop: 'Jontro', label: 'Electronics',
		tagline: 'Laptops and phones with full spec tables.',
		shows: ['Filter by RAM, processor, brand', 'Storage variants per model', 'Spec table on every product'],
		products: 52, theme: 'Tech theme'
	},
	{
		key: 'beauty', region: 'south-asia', shop: 'Rupkotha', label: 'Beauty & skincare',
		tagline: 'Skincare, makeup and attar with shade variants.',
		shows: ['Shade swatches on makeup', 'Filter by skin type and concern', 'Batch and expiry messaging'],
		products: 56, theme: 'Fashion theme'
	},
	{
		key: 'home', region: 'south-asia', shop: 'Ghor Shonshar', label: 'Home & living',
		tagline: 'Kitchen, bedding and furniture with delivery promises.',
		shows: ['Bulky-item delivery copy', 'Material filters on furniture', 'Six categories, deep catalogue'],
		products: 56, theme: 'Fashion theme'
	},

	{
		key: 'gulf-fashion', region: 'middle-east', shop: 'Layali', label: 'Modest fashion',
		tagline: 'Abayas, kaftans and kandura priced in dirhams.',
		shows: ['Bilingual Arabic and English titles', 'Tabby and Tamara pay-in-4', 'VAT-inclusive prices, as required'],
		products: 38, theme: 'Gulf theme'
	},
	{
		key: 'gulf-tech', region: 'middle-east', shop: 'Barq', label: 'Electronics',
		tagline: 'Phones and laptops with genuine UAE warranty.',
		shows: ['Same-day Dubai delivery copy', 'Filter by RAM, brand, storage', 'Gulf-scale basket sizes'],
		products: 36, theme: 'Gulf theme'
	},
	{
		key: 'gulf-grocery', region: 'middle-east', shop: 'Souq Yawmi', label: 'Grocery',
		tagline: 'Fresh produce and halal meat in two-hour slots.',
		shows: ['Halal certification on every item', 'Origin country as a filter', 'Ramadan delivery slots'],
		products: 40, theme: 'Gulf theme'
	}
];

export const CONTACT = {
	whatsapp: '8801841252123',
	phone: '+8801841252123',
	email: 'fajrlabs.io@gmail.com'
};
