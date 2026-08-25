// Two regions, two businesses. South Asia is a COD-and-returns problem; the Gulf
// is a high-AOV, fast-delivery, BNPL problem. The landing page says so.
export type RegionId = 'south-asia' | 'middle-east';

export type Region = {
	id: RegionId;
	label: string;
	short: string;
	markets: string[];
	// The one sentence that has to land in the first three seconds.
	headline: { lead: string; trail: string };
	eyebrow: string;
	// Two lines under the headline. Anything longer stops being read.
	hook: string;
	pitch: string;
	// Three numbers that make the problem concrete for this region.
	stats: { figure: string; body: string }[];
	currency: string;
	locale: string;
	// What a merchant here already recognises. Naming the wrong ones loses trust.
	couriers: string[];
	payments: string[];
	proof: string;
	priceFrom: { currency: string; amount: number };
	status: 'live' | 'building';
	note: string;
};

export const REGIONS: Region[] = [
	{
		id: 'south-asia',
		label: 'South Asia',
		short: 'South Asia',
		markets: ['Bangladesh', 'Pakistan'],
		eyebrow: 'Bangladesh first, Pakistan next',
		headline: { lead: 'Your return rate is the problem.', trail: 'Not your website.' },
		hook: 'Cash on delivery makes the sale here and takes the profit back. We stop that, on every order.',
		pitch:
			'Cash on delivery is most of your revenue and most of your losses. Fajr Shop scores every order before you accept it, routes the parcel to whichever courier actually delivers on that street, and reconciles the money when it finally lands.',
		stats: [
			{ figure: '20–35%', body: 'of COD orders come back. Every one costs you the delivery both ways.' },
			{ figure: 'Days later', body: 'is when COD money arrives, in batches most shops never reconcile.' },
			{ figure: 'Every order', body: 'gets a confirmation call at most shops — including the ones that never needed one.' }
		],
		currency: 'BDT',
		locale: 'en-BD',
		couriers: ['Steadfast', 'Pathao', 'RedX', 'eCourier'],
		payments: ['Cash on delivery', 'bKash', 'Nagad', 'SSLCommerz'],
		proof: 'Bangla and English storefronts, every district, COD reconciliation built in.',
		priceFrom: { currency: 'BDT', amount: 4500 },
		status: 'live',
		note: 'Live today, with the same adapters covering the next market.'
	},
	{
		id: 'middle-east',
		label: 'Middle East',
		short: 'Gulf',
		markets: ['UAE', 'Saudi Arabia', 'Kuwait', 'Qatar', 'Bahrain', 'Oman'],
		eyebrow: 'UAE first, then the wider Gulf',
		headline: { lead: 'Arabic-first, not Arabic-translated.', trail: 'Built for the way the Gulf buys.' },
		hook: 'Bigger baskets, same-day delivery and pay-in-four. Built for that, not translated into it.',
		pitch:
			'Tax-inclusive pricing the way the law requires there, same-day expectations built into the courier engine, and the payment methods people actually reach for. English-first for now, with Arabic and right-to-left as the next step rather than a claim we have not earned.',
		stats: [
			{ figure: '3–5×', body: 'the average order value of South Asia, so every abandoned cart costs more.' },
			{ figure: 'Same day', body: 'is the delivery expectation in Dubai. Next day is already a compromise.' },
			{ figure: '~85%', body: 'of the UAE is expat, so English sells — but Arabic is what earns trust.' }
		],
		currency: 'AED',
		locale: 'en-AE',
		couriers: ['Aramex', 'Fetchr', 'Quiqup'],
		payments: ['mada', 'Apple Pay', 'Tabby', 'Tamara', 'Cash on delivery'],
		proof: 'AED and SAR, tax-inclusive display, Gulf couriers and BNPL. English-first, with Arabic and full RTL as the next step.',
		priceFrom: { currency: 'AED', amount: 240 },
		status: 'building',
		note: 'In build. Currency, tax, adapters and the storefront theme are done; the Arabic catalogue is not.'
	}
];

export const regionById = (id: string): Region =>
	REGIONS.find((r) => r.id === id) ?? REGIONS[0]!;

// Intl, so BDT and AED both format the way their own market writes them.
export const money = (amount: number, currency: string, locale: string) =>
	new Intl.NumberFormat(locale, {
		style: 'currency',
		currency,
		maximumFractionDigits: 0
	}).format(amount);

// Where each market actually is, so the globe is a map rather than a decoration.
// Coordinates are the commercial centre, not the capital, where they differ.
export type Market = { name: string; region: RegionId; lat: number; lon: number };

export const MARKETS: Market[] = [
	{ name: 'Bangladesh', region: 'south-asia', lat: 23.8, lon: 90.4 },
	{ name: 'Pakistan', region: 'south-asia', lat: 24.9, lon: 67.0 },
	{ name: 'UAE', region: 'middle-east', lat: 25.2, lon: 55.3 },
	{ name: 'Saudi Arabia', region: 'middle-east', lat: 24.7, lon: 46.7 },
	{ name: 'Kuwait', region: 'middle-east', lat: 29.4, lon: 48.0 },
	{ name: 'Qatar', region: 'middle-east', lat: 25.3, lon: 51.5 },
	{ name: 'Bahrain', region: 'middle-east', lat: 26.2, lon: 50.6 },
	{ name: 'Oman', region: 'middle-east', lat: 23.6, lon: 58.5 }
];
