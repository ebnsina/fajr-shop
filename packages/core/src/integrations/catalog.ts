export type Field = {
	key: string;
	label: string;
	// A secret is masked once saved and only overwritten when retyped.
	secret?: boolean;
	optional?: boolean;
	help?: string;
	placeholder?: string;
};

export type Kind = 'courier' | 'payment' | 'sms' | 'chat' | 'analytics';

export type Listing = {
	slug: string;
	name: string;
	kind: Kind;
	// Which markets this is worth showing. A Dhaka merchant should not scroll
	// past Tamara to find Steadfast.
	regions: ('south-asia' | 'middle-east')[];
	blurb: string;
	// What the merchant gets, in their words, not ours.
	does: string;
	fields: Field[];
	docsUrl?: string;
	// Built and tested, or listed so the roadmap is visible and honest.
	status: 'available' | 'coming-soon';
};

const KEY = (label = 'API key'): Field => ({ key: 'apiKey', label, secret: true });
const SECRET = (label = 'API secret'): Field => ({ key: 'apiSecret', label, secret: true });

export const CATALOG: Listing[] = [
	// ── couriers ──────────────────────────────────────────────────────────
	{
		slug: 'steadfast',
		name: 'Steadfast',
		kind: 'courier',
		regions: ['south-asia'],
		blurb: 'Nationwide COD courier, strongest outside Dhaka.',
		does: 'Books parcels, pulls tracking, and reconciles the COD payout against what was delivered.',
		fields: [KEY(), SECRET('Secret key')],
		docsUrl: 'https://steadfast.com.bd',
		status: 'available'
	},
	{
		slug: 'pathao',
		name: 'Pathao Courier',
		kind: 'courier',
		regions: ['south-asia'],
		blurb: 'Fast inside Dhaka and the big metros.',
		does: 'Books parcels against your Pathao store, syncs status, and returns the delivery fee per zone.',
		fields: [
			{ key: 'clientId', label: 'Client ID' },
			{ key: 'clientSecret', label: 'Client secret', secret: true },
			{ key: 'username', label: 'Username' },
			{ key: 'password', label: 'Password', secret: true },
			{ key: 'storeId', label: 'Store ID' },
			{ key: 'sandbox', label: 'Sandbox mode', optional: true, help: 'Set to true while testing.' }
		],
		docsUrl: 'https://merchant.pathao.com',
		status: 'available'
	},
	{
		slug: 'redx',
		name: 'RedX',
		kind: 'courier',
		regions: ['south-asia'],
		blurb: 'Wide upazila coverage at competitive rates.',
		does: 'Books parcels, tracks them, and exposes area codes so the checkout can quote properly.',
		fields: [KEY('Access token')],
		docsUrl: 'https://redx.com.bd',
		status: 'available'
	},
	{
		slug: 'ecourier',
		name: 'eCourier',
		kind: 'courier',
		regions: ['south-asia'],
		blurb: 'Long-standing nationwide network.',
		does: 'Books parcels and returns tracking against your eCourier account.',
		fields: [
			{ key: 'apiKey', label: 'API key', secret: true },
			{ key: 'apiSecret', label: 'API secret', secret: true },
			{ key: 'userId', label: 'User ID' }
		],
		status: 'available'
	},
	{
		slug: 'aramex',
		name: 'Aramex',
		kind: 'courier',
		regions: ['middle-east'],
		blurb: 'The default across the GCC, with same-day in Dubai.',
		does: 'Creates shipments, prints labels and tracks across the Emirates and the wider Gulf.',
		fields: [
			{ key: 'username', label: 'Username' },
			{ key: 'password', label: 'Password', secret: true },
			{ key: 'accountNumber', label: 'Account number' },
			{ key: 'accountPin', label: 'Account PIN', secret: true },
			{ key: 'accountEntity', label: 'Account entity', placeholder: 'DXB' },
			{ key: 'accountCountryCode', label: 'Country code', placeholder: 'AE' }
		],
		docsUrl: 'https://www.aramex.com/developers',
		status: 'available'
	},

	// ── payments ──────────────────────────────────────────────────────────
	{
		slug: 'sslcommerz',
		name: 'SSLCommerz',
		kind: 'payment',
		regions: ['south-asia'],
		blurb: 'One contract covering cards, bKash, Nagad and Rocket.',
		does: 'Takes online payment at checkout and confirms it against the order before you ship.',
		fields: [
			{ key: 'storeId', label: 'Store ID' },
			{ key: 'storePassword', label: 'Store password', secret: true },
			{ key: 'sandbox', label: 'Sandbox mode', optional: true, help: 'Set to true while testing.' }
		],
		docsUrl: 'https://developer.sslcommerz.com',
		status: 'available'
	},
	{
		slug: 'tap',
		name: 'Tap Payments',
		kind: 'payment',
		regions: ['middle-east'],
		blurb: 'One integration for the whole Gulf, including mada and KNET.',
		does: 'Takes cards, Apple Pay, mada, KNET and Benefit across the UAE, Saudi, Kuwait, Bahrain, Qatar and Oman.',
		fields: [
			{ key: 'secretKey', label: 'Secret key', secret: true },
			{ key: 'publishableKey', label: 'Publishable key' },
			{ key: 'sandbox', label: 'Sandbox mode', optional: true, help: 'Set to true while testing.' }
		],
		docsUrl: 'https://developers.tap.company',
		status: 'available'
	},
	{
		slug: 'tabby',
		name: 'Tabby',
		kind: 'payment',
		regions: ['middle-east'],
		blurb: 'Pay in four, interest free. Raises basket size measurably.',
		does: 'Splits the order into four payments. You are paid in full up front; Tabby carries the risk.',
		fields: [
			{ key: 'publicKey', label: 'Public key' },
			{ key: 'secretKey', label: 'Secret key', secret: true },
			{ key: 'merchantCode', label: 'Merchant code' }
		],
		docsUrl: 'https://docs.tabby.ai',
		status: 'available'
	},
	{
		slug: 'tamara',
		name: 'Tamara',
		kind: 'payment',
		regions: ['middle-east'],
		blurb: 'Split payments, strongest in Saudi.',
		does: 'Offers pay-later at checkout and settles with you up front.',
		fields: [{ key: 'apiToken', label: 'API token', secret: true }, { key: 'notificationToken', label: 'Notification token', secret: true }],
		docsUrl: 'https://docs.tamara.co',
		status: 'available'
	},

	// ── sms ───────────────────────────────────────────────────────────────
	{
		slug: 'alpha-sms',
		name: 'Alpha SMS',
		kind: 'sms',
		regions: ['south-asia'],
		blurb: 'Bangla-capable SMS at local rates.',
		does: 'Sends order confirmations, shipping updates and delivery notices in Bangla or English.',
		fields: [KEY(), { key: 'senderId', label: 'Sender ID', optional: true }],
		status: 'available'
	},
	{
		slug: 'twilio',
		name: 'Twilio',
		kind: 'sms',
		regions: ['middle-east', 'south-asia'],
		blurb: 'International SMS and WhatsApp, priced per message.',
		does: 'Sends order messages anywhere, and carries the WhatsApp channel if you enable it.',
		fields: [
			{ key: 'accountSid', label: 'Account SID' },
			{ key: 'authToken', label: 'Auth token', secret: true },
			{ key: 'from', label: 'From number', placeholder: '+9715XXXXXXX' }
		],
		docsUrl: 'https://www.twilio.com/docs',
		status: 'available'
	},

	// ── chat ──────────────────────────────────────────────────────────────
	{
		slug: 'whatsapp',
		name: 'WhatsApp Business',
		kind: 'chat',
		regions: ['south-asia', 'middle-east'],
		blurb: 'Where most of this market actually replies.',
		does: 'Receives customer messages into the shared inbox and sends order updates on the channel they read.',
		fields: [
			{ key: 'phoneNumberId', label: 'Phone number ID' },
			{ key: 'accessToken', label: 'Access token', secret: true },
			{ key: 'verifyToken', label: 'Webhook verify token', secret: true }
		],
		docsUrl: 'https://developers.facebook.com/docs/whatsapp',
		status: 'available'
	},
	{
		slug: 'messenger',
		name: 'Facebook Messenger',
		kind: 'chat',
		regions: ['south-asia'],
		blurb: 'Most BD shops still sell from a Facebook page.',
		does: 'Pulls page messages into the same inbox as WhatsApp, so nothing is answered twice.',
		fields: [
			{ key: 'pageId', label: 'Page ID' },
			{ key: 'pageAccessToken', label: 'Page access token', secret: true },
			{ key: 'verifyToken', label: 'Webhook verify token', secret: true }
		],
		docsUrl: 'https://developers.facebook.com/docs/messenger-platform',
		status: 'available'
	},

	// ── analytics ─────────────────────────────────────────────────────────
	{
		slug: 'facebook-capi',
		name: 'Meta Conversions API',
		kind: 'analytics',
		regions: ['south-asia', 'middle-east'],
		blurb: 'Server-side events, so iOS and ad blockers stop hiding your conversions.',
		does: 'Sends purchase and add-to-cart events straight to Meta, matched by hashed phone and email.',
		fields: [
			{ key: 'pixelId', label: 'Pixel ID' },
			{ key: 'accessToken', label: 'Access token', secret: true }
		],
		status: 'available'
	},
	{
		slug: 'umami',
		name: 'Umami',
		kind: 'analytics',
		regions: ['south-asia', 'middle-east'],
		blurb: 'Self-hosted page analytics with no cookie banner.',
		does: 'Counts visits and referrers without third-party tracking or a consent popup.',
		fields: [
			{ key: 'scriptUrl', label: 'Script URL', placeholder: 'https://analytics.example.com/script.js' },
			{ key: 'websiteId', label: 'Website ID' }
		],
		status: 'available'
	}
];

export const listingFor = (slug: string) => CATALOG.find((c) => c.slug === slug) ?? null;
