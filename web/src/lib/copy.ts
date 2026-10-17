// Every word the app shows, in one place, so Bengali can be added beside it later.
import type { components } from '#lib/api.js';

type ErrorCode = components['schemas']['ErrorCode'] | 'not_staff';
type Permission = components['schemas']['Permission'];

export const errors: Record<ErrorCode, string> = {
	validation: 'Please check the highlighted fields.',
	not_found: 'We couldn’t find that. It may have been removed.',
	method_not_allowed: 'Something went wrong. Try again.',
	unauthenticated: 'Please sign in.',
	session_expired: 'You were signed out. Please sign in again.',
	forbidden: 'You don’t have permission to do this.',
	invalid_credentials: 'That email and password don’t match. Try again.',
	account_exists: 'There’s already an account with this email or phone. Try signing in.',
	rate_limited: 'Too many tries. Wait a minute, then try again.',
	internal: 'Something went wrong on our side. Try again in a moment.',
	in_use: 'This is still in use. Move what’s in it first.',
	not_deliverable: 'We don’t deliver to that district yet.',
	cart_empty: 'Your bag is empty.',
	cart_changed: 'Something in your bag changed. Check your bag and try again.',
	status_changed: 'Someone else changed this order first. Look at it again.',
	insufficient_stock: 'There isn’t that much in stock to take away.',
	too_large: 'That image is over 10 MB. Try a smaller one.',
	unsupported_type: 'Upload a JPEG, PNG or WebP image.',
	not_staff: 'This account can’t open the shop dashboard.'
};

/** Plain words for an API error code; anything unknown gets the general message. */
export function errorText(code: unknown) {
	return (typeof code === 'string' && errors[code as ErrorCode]) || errors.internal;
}

export const permissions: Record<Permission, { label: string; hint: string }> = {
	'store:write': {
		label: 'Change store settings',
		hint: 'Name, contact details, colors and VAT.'
	},
	'catalog:write': {
		label: 'Manage products',
		hint: 'Add and change products, categories and images.'
	},
	'inventory:write': { label: 'Change stock', hint: 'Add or take away stock, with a reason.' },
	'orders:write': {
		label: 'Handle orders',
		hint: 'See orders and move them on: confirm, ship, cancel.'
	},
	'api_keys:manage': {
		label: 'Manage API keys',
		hint: 'Create and revoke keys.'
	},
	'audit:read': {
		label: 'Read the activity log',
		hint: 'Who changed what, and when.'
	}
};

/** What an API key may be given. Managing keys is for signed-in people only. */
export const keyScopes: components['schemas']['ApiKeyScope'][] = [
	'catalog:write',
	'inventory:write',
	'store:write',
	'audit:read'
];

export const nav = {
	label: 'Shop dashboard',
	overview: 'Overview',
	orders: 'Orders',
	customers: 'Customers',
	shop: 'Shop',
	catalog: 'Catalog',
	products: 'Products',
	categories: 'Categories',
	banners: 'Banners',
	shipping: 'Delivery',
	discounts: 'Discounts',
	team: 'Team',
	reviews: 'Reviews',
	questions: 'Questions',
	storeSettings: 'Store settings',
	activity: 'Activity',
	developers: 'Developers',
	apiKeys: 'API keys',
	signOut: 'Sign out'
};

export const signIn = {
	title: 'Sign in to your shop',
	description: 'Use the email and password you were given when the shop was set up.'
};

export const storeSettings = {
	title: 'Store settings',
	description: 'How your shop appears to customers. Changes show on your shop within a minute.',
	identity: 'Your shop',
	name: 'Shop name',
	logo: 'Logo',
	logoHint: 'Shown at the top of your shop. A wide image on a clear background works best.',
	logoUpload: 'Upload a logo',
	logoRemove: 'Remove logo',
	accent: 'Brand color',
	accentHint: 'Used for buttons and links.',
	contactPhone: 'Phone',
	contactEmail: 'Email',
	contactHint: 'Shown to customers so they can reach you.',
	whatsapp: 'WhatsApp number (optional)',
	whatsappHint: 'Product pages get an “Order on WhatsApp” button that messages this number.',
	currency: 'Currency',
	currencyValue: 'Bangladeshi taka (৳)',
	vat: 'VAT',
	vatEnabled: 'Charge VAT',
	vatHint: 'Turn on if your shop is VAT-registered. Ask your accountant which rate applies to you.',
	vatRate: 'VAT rate',
	pricesIncludeVat: 'My prices already include VAT',
	pricesIncludeVatHint: 'Off means VAT is added on top at checkout.',
	bin: 'BIN',
	binHint: 'Your Business Identification Number. It is printed on Mushak-6.3 invoices.',
	save: 'Save changes',
	saved: 'Store settings saved',
	highlights: 'Promises on the home page',
	highlightsHint:
		'Up to four, shown in a strip under the banners. Leave a title empty to remove it.',
	highlightIcon: 'Icon',
	highlightTitle: 'Title',
	highlightText: 'Short line',
	icons: {
		cash: 'Cash',
		truck: 'Delivery truck',
		return: 'Return arrow',
		shield: 'Shield',
		phone: 'Headset',
		gift: 'Gift'
	}
};

export const apiKeys = {
	title: 'API keys',
	description:
		'Let another app or service work with your shop, such as accounting software. Only create a key for something you trust.',
	create: 'Create a key',
	name: 'What will use this key?',
	nameHint: 'For example: Accounting sync.',
	scopes: 'What it may do',
	scopesError: 'Choose at least one.',
	createdTitle: 'Copy your new key now',
	createdBody:
		'For your security it won’t be shown again. If you lose it, revoke it and create another.',
	copy: 'Copy key',
	emptyTitle: 'No API keys yet',
	emptyBody: 'You only need one if another app should connect to your shop.',
	listCaption: 'Active API keys',
	columns: {
		name: 'Name',
		key: 'Key',
		access: 'May',
		created: 'Created',
		actions: 'Actions'
	},
	revoke: 'Revoke',
	revokeConfirm: 'Revoke it?',
	revoked: 'Key revoked'
};

export const activityPage = {
	title: 'Activity',
	description: 'Every change made in your shop dashboard or through an API key.',
	caption: 'Recent activity',
	columns: { when: 'When', who: 'Who', what: 'What' },
	system: 'The system',
	older: 'Older activity',
	newest: 'Back to newest',
	emptyTitle: 'Nothing has happened yet',
	emptyBody: 'Changes to your shop will be listed here.'
};

export const errorPage = {
	notFound: 'Page not found',
	notFoundBody: 'The page you were looking for isn’t here.',
	other: 'Something went wrong',
	otherBody: 'Try again in a moment.',
	home: 'Go to the home page'
};

export const productStatus = {
	draft: 'Draft',
	active: 'For sale',
	archived: 'Archived'
} as const;

export const products = {
	title: 'Products',
	description: 'Everything in your shop. Only products marked “For sale” appear to customers.',
	add: 'Add a product',
	search: 'Search products',
	filter: 'Show',
	all: 'All',
	caption: 'Products',
	columns: { product: 'Product', status: 'Status', price: 'Price', stock: 'Stock' },
	inStock: 'In stock',
	outOfStock: 'Out of stock',
	next: 'Next page',
	first: 'Back to the first page',
	emptyTitle: 'No products yet',
	emptyBody: 'Add your first product and it will appear here.',
	noMatchTitle: 'No products match',
	noMatchBody: 'Try other words, or show all products.'
};

export const productEditor = {
	newTitle: 'Add a product',
	back: 'All products',
	details: 'Details',
	name: 'Name',
	description: 'Description',
	descriptionHint: 'What it is, what it’s made of, how it fits. Customers read this before buying.',
	status: 'Status',
	featured: 'Featured on the home page',
	organize: 'Organize',
	brand: 'Brand',
	brandHint: 'Shoppers can browse by brand.',
	category: 'Category',
	noCategory: 'No category',
	images: 'Photos',
	mainPhoto: 'Main',
	imagesHint:
		'JPEG, PNG or WebP, up to 10 MB each. The first photo is the main one; drag to reorder.',
	addImages: 'Add photos',
	uploading: 'Uploading…',
	removeImage: 'Remove photo',
	imageOrder: 'Photo order',
	options: 'Options',
	optionsHint: 'Sizes, colors or other choices. Leave empty if there’s only one kind.',
	optionName: 'Option name',
	optionNamePlaceholder: 'Size',
	optionValues: 'Values',
	optionValuesPlaceholder: 'Type a value and press Enter',
	addOption: 'Add an option',
	removeOption: 'Remove option',
	variants: 'Prices and stock',
	variantsHint: 'One row for each combination you sell.',
	only: 'This product',
	price: 'Price',
	compareAt: 'Old price',
	compareAtHint: 'Shown crossed out, for a sale.',
	sku: 'SKU',
	stock: 'Stock',
	startingStock: 'Starting stock',
	adjust: 'Adjust',
	save: 'Save product',
	saved: 'Product saved',
	delete: 'Delete product',
	deleteConfirm: 'Delete for good?',
	deleted: 'Product deleted',
	view: 'View in shop',
	adjustTitle: 'Adjust stock',
	adjustDescription: 'Add stock you received, or take away what was damaged or lost.',
	delta: 'Change',
	deltaHint: 'Use a minus sign to take away, like -2.',
	reason: 'Reason',
	reasons: {
		received: 'Received new stock',
		returned: 'Customer returned it',
		damaged: 'Damaged',
		lost: 'Lost',
		correction: 'Correcting a miscount'
	},
	note: 'Note',
	adjustSave: 'Save',
	adjusted: 'Stock updated'
};

export const categories = {
	title: 'Categories',
	description: 'Group your products so customers can browse them.',
	add: 'Add a category',
	name: 'Name',
	parent: 'Inside',
	topLevel: 'Top level',
	position: 'Order',
	positionHint: 'Lower numbers come first.',
	picture: 'Picture',
	pictureHint: 'Shown in a circle on the home page. A square picture works best.',
	removePicture: 'Remove picture',
	edit: 'Edit',
	editTitle: 'Edit category',
	save: 'Save',
	saved: 'Category saved',
	delete: 'Delete',
	deleteConfirm: 'Delete it?',
	deleted: 'Category deleted',
	caption: 'Categories',
	emptyTitle: 'No categories yet',
	emptyBody: 'Add one, such as “Men” or “Saree”.'
};

export const shop = {
	skip: 'Skip to content',
	menu: 'Open menu',
	all: 'Shop all',
	search: 'Search',
	searchPlaceholder: 'Search the shop',
	home: 'Home',
	newest: 'New in',
	seeAll: 'See everything',
	soldOut: 'Sold out',
	sale: 'Sale',
	from: 'From',
	was: 'was',
	noPhoto: 'no photo yet',
	inStock: 'In stock',
	onlyLeft: (n: number) => `Only ${n} left`,
	filters: 'Filters',
	minPrice: 'Lowest price',
	maxPrice: 'Highest price',
	minPlaceholder: 'Min ৳',
	maxPlaceholder: 'Max ৳',
	priceRange: 'Price',
	availability: 'Availability',
	inStockOnly: 'In stock only',
	onSaleOnly: 'On sale',
	category: 'Category',
	brand: 'Brand',
	more: (n: number) => `${n} more`,
	from_: (price: string) => `From ${price}`,
	upTo: (price: string) => `Up to ${price}`,
	active: 'Filters in use',
	remove: (what: string) => `Remove ${what}`,
	clearAll: 'Clear all',
	apply: 'Apply',
	clear: 'Clear filters',
	sort: 'Sort by',
	sorts: {
		newest: 'Newest',
		price_asc: 'Price, low to high',
		price_desc: 'Price, high to low',
		name: 'Name, A to Z'
	},
	next: 'More products',
	first: 'Back to the start',
	emptyTitle: 'Nothing here yet',
	emptyBody: 'New products will appear here soon.',
	noMatchTitle: 'Nothing matches those filters',
	noMatchBody: 'Try a wider price range, or clear the filters.',
	searchTitle: 'Search',
	searchResults: (q: string) => `Results for “${q}”`,
	searchEmpty: 'Type what you’re looking for.',
	searchNone: (q: string) => `Nothing found for “${q}”. Try other words.`,
	pictures: 'Pictures',
	picture: (i: number, n: number) => `Picture ${i} of ${n}`,
	contact: 'Contact',
	vatIncluded: 'Price includes VAT.',
	vatAdded: (rate: string) => `VAT (${rate}) is added at checkout.`
};

export const wishlist = {
	title: 'Saved items',
	open: (n: number) => (n ? `Saved items, ${n}` : 'Saved items'),
	save: (name: string) => `Save ${name}`,
	unsave: (name: string) => `Remove ${name} from saved items`,
	saved: 'Saved',
	saveLabel: 'Save',
	signIn: 'Sign in to save items',
	guestHint: 'Saved on this device.',
	signInToKeep: 'Sign in to keep them on every device',
	emptyTitle: 'Nothing saved yet',
	emptyBody: 'Tap the heart on any product to keep it here for later.',
	browse: 'Browse the shop'
};

export const ratings = {
	stars: (avg: string, n: number) =>
		`Rated ${avg} out of 5 from ${n} ${n === 1 ? 'review' : 'reviews'}`
};

export const reviewCopy = {
	tab: (n: number) => (n ? `Reviews (${n})` : 'Reviews'),
	outOf: (avg: string) => `${avg} out of 5`,
	count: (n: number) => `${n} ${n === 1 ? 'review' : 'reviews'}`,
	starsLabel: (n: number) => `${n} ${n === 1 ? 'star' : 'stars'}`,
	none: 'No reviews yet. Bought it? Tell others what you think.',
	write: 'Write a review',
	yours: 'Your review',
	edit: 'Edit your review',
	rating: 'Your rating',
	body: 'What did you think? (optional)',
	bodyPlaceholder: 'How was the quality, the fit, the delivery…',
	save: 'Post review',
	update: 'Save changes',
	delete: 'Delete',
	deleteConfirm: 'Delete it?',
	saved: 'Thanks, your review is posted.',
	deleted: 'Your review is deleted.',
	hidden: 'The shop has hidden this review from others.',
	signIn: 'Sign in to write a review',
	more: 'More reviews',
	cancel: 'Cancel',
	edited: 'edited'
};

export const questionCopy = {
	tab: (n: number) => (n ? `Questions (${n})` : 'Questions'),
	none: 'No questions yet. Ask the shop anything about this product.',
	ask: 'Ask a question',
	label: 'Your question',
	placeholder: 'Does it come in a bigger size? Is it original?',
	send: 'Send question',
	sent: 'Question sent. The answer will appear here.',
	waiting: 'Waiting for the shop to answer',
	answer: 'Answer from the shop',
	signIn: 'Sign in to ask a question',
	asked: (name: string, date: string) => `${name} · ${date}`
};

export const productPage = {
	soldOut: 'Sold out',
	notOffered: 'Not available in this combination',
	description: 'Description',
	details: 'Details',
	sections: 'About this product',
	brand: 'Brand',
	category: 'Category',
	sku: 'SKU',
	weight: 'Weight',
	noDescription: 'The shop hasn’t written a description yet.',
	similar: 'Similar products',
	buyNow: 'Buy now',
	keyFeatures: 'Key features',
	whatsappAsk: 'Ask about restock on WhatsApp',
	whatsappAskText: (name: string, url: string) => `Hi, when will ${name} be back in stock? ${url}`,
	whatsapp: 'Order on WhatsApp',
	whatsappText: (name: string, url: string) => `Hi, I'd like to order ${name}. ${url}`
};

export const cart = {
	bag: 'Your bag',
	open: (n: number) => (n ? `Bag, ${n} ${n === 1 ? 'item' : 'items'}` : 'Bag, empty'),
	add: 'Add to bag',
	addNamed: (name: string) => `Add ${name} to bag`,
	choose: (name: string) => `Choose options for ${name}`,
	fullDetails: 'See full details',
	added: (name: string) => `${name} added to your bag`,
	quantity: 'Quantity',
	viewBag: 'View bag',
	empty: 'Your bag is empty.',
	browse: 'Browse the shop',
	subtotal: (n: number) => `Subtotal · ${n} ${n === 1 ? 'item' : 'items'}`,
	note: 'Delivery is worked out at checkout, before you pay.',
	vatNote: (rate: string) => `VAT (${rate}) is added at checkout.`,
	fewer: 'One fewer',
	more: 'One more',
	quantityOf: (name: string) => `Quantity of ${name}`,
	remove: (name: string) => `Remove ${name}`,
	allWeHave: 'That’s all we have.',
	unavailable: 'No longer for sale',
	soldOut: 'Sold out',
	onlyLeft: (n: number) => `Only ${n} left. Lower the quantity to buy it.`,
	title: 'Your bag',
	each: (price: string) => `${price} each`,
	summary: 'Order summary',
	keepShopping: 'Continue shopping',
	checkout: 'Checkout',
	items: (n: number) => `${n} ${n === 1 ? 'item' : 'items'}`,
	code: 'Discount code',
	codePlaceholder: 'Enter a code',
	useCode: 'Apply',
	removeCode: (code: string) => `Remove code ${code}`,
	discountLine: (code: string) => `Discount (${code})`,
	afterDiscount: 'After discount',
	/** Why a code on the bag isn't taking anything off; min is already formatted. */
	codeWaits: {
		below_minimum: (more: string) => `Add ${more} more to use this code.`,
		not_started: () => 'This code isn’t on yet.',
		ended: () => 'This code has ended.',
		used_up: () => 'This code has been used up.',
		inactive: () => 'This code isn’t valid any more.'
	}
};

export const storefront = {
	hotline: 'Hotline',
	searchLabel: 'Search products',
	searchButton: 'Search',
	categories: 'Categories',
	allCategories: 'All categories',
	featured: 'Featured',
	onSale: 'On sale',
	newArrivals: 'New arrivals',
	more: 'More products',
	viewAll: 'View all',
	off: (pct: number) => `−${pct}%`,
	bottomNav: 'Shop sections',
	home: 'Home',
	bag: 'Bag',
	help: 'Help',
	shop: 'Shop',
	contact: 'Contact us',
	cod: 'Cash on delivery available',
	backToTop: 'Back to top',
	myAccount: 'My account',
	service: 'Customer service',
	hotlineHours: 'Call us any day'
};

export const banners = {
	title: 'Banners',
	description:
		'The pictures across your home page. Wide pictures work best: about 2:1 for the slides.',
	add: 'Add a banner',
	picture: 'Picture',
	pictureHint: 'JPEG, PNG or WebP, up to 10 MB.',
	placement: 'Where it goes',
	placementHint:
		'Big slides take turns at the top. Up to two more sit beside them. Strips go across the page between product sections.',
	placements: {
		hero: { label: 'Big slide', hint: 'The large slides at the top of the home page.' },
		side: { label: 'Beside the slides', hint: 'Up to two, stacked next to the slides.' },
		wide: { label: 'Across the page', hint: 'A full-width strip between product sections.' }
	},
	alt: 'What it says',
	altHint: 'Read aloud to people who can’t see it, e.g. “Eid sale: 20% off panjabis”.',
	link: 'Link (optional)',
	linkHint: 'A page in your shop like /c/saree, or a full https:// address.',
	position: 'Order',
	active: 'Show on the shop',
	save: 'Save',
	saved: 'Banner saved',
	delete: 'Delete',
	deleteConfirm: 'Delete it?',
	deleted: 'Banner deleted',
	hidden: 'Hidden',
	edit: 'Edit',
	editTitle: 'Edit banner',
	emptyTitle: 'No banners yet',
	emptyBody: 'Without banners, the home page shows your shop’s name and a Shop all button.'
};

export const account = {
	signIn: 'Sign in',
	register: 'Register',
	account: 'Account',
	yourAccount: 'Your account',
	signOut: 'Sign out',
	signInTitle: 'Sign in',
	signInLede: 'Welcome back. Use the email or phone number you registered with.',
	registerTitle: 'Create your account',
	registerLede: 'Save your details for faster checkout and see your orders in one place.',
	login: 'Email or phone',
	name: 'Your name',
	phone: 'Mobile number',
	phoneHint: 'Like 01712345678. We text order updates to it.',
	email: 'Email (optional)',
	password: 'Password',
	passwordHint: 'At least 8 characters.',
	noAccount: 'New here?',
	haveAccount: 'Already have an account?',
	createOne: 'Create an account',
	signInInstead: 'Sign in',
	details: 'Your details',
	shopNow: 'Start shopping',
	hello: (name: string) => `Hello, ${name.split(' ')[0]}`
};

export const home = {
	recommended: 'Recommended for you',
	tabs: { newest: 'New arrivals', sale: 'On sale', featured: 'Featured' },
	brands: 'Top brands',
	products: (n: number) => `${n} ${n === 1 ? 'product' : 'products'}`
};

export const overview = {
	title: 'Overview',
	description: 'How your shop is doing at a glance.',
	addProduct: 'Add a product',
	addBanner: 'Add a banner',
	waiting: 'Orders to confirm',
	toShip: 'Orders to ship',
	today: (n: number) => `Sales today · ${n} ${n === 1 ? 'order' : 'orders'}`,
	week: (n: number) => `Last 7 days · ${n} ${n === 1 ? 'order' : 'orders'}`,
	forSale: 'Products for sale',
	drafts: 'Drafts',
	soldOut: 'Sold-out variants',
	categories: 'Categories',
	lowStock: 'Running low',
	lowStockNone: 'Nothing is running low.',
	product: 'Product',
	left: 'Left',
	recent: 'Recent activity',
	recentNone: 'Nothing has happened yet.',
	allActivity: 'All activity',
	system: 'The system'
};

export const shippingAdmin = {
	title: 'Delivery',
	description:
		'Where you deliver and what it costs. Each district belongs to one zone; shoppers see the charge for their district before they pay.',
	add: 'Add a zone',
	edit: 'Edit',
	editTitle: 'Edit zone',
	save: 'Save',
	saved: 'Zone saved',
	delete: 'Delete',
	deleteConfirm: 'Delete it?',
	deleted: 'Zone deleted',
	name: 'Zone name',
	namePlaceholder: 'Inside Dhaka',
	days: 'Delivery time',
	daysPlaceholder: '1–2 days',
	baseCharge: 'Charge',
	baseChargeHint: 'For a parcel up to the weight below.',
	baseWeight: 'Up to (kg)',
	extraPerKg: 'Each extra kg',
	freeOver: 'Free delivery over (optional)',
	freeOverHint: 'Leave empty if delivery is never free here.',
	districts: 'Districts',
	districtsHint: 'Ticked districts get this zone’s charge. Greyed ones are in another zone.',
	inZone: (zone: string) => `in ${zone}`,
	selectFree: 'Tick every district not in a zone',
	clear: 'Clear',
	active: 'Delivering to this zone',
	hidden: 'Not delivering',
	districtCount: (n: number) => `${n} ${n === 1 ? 'district' : 'districts'}`,
	summary: (charge: string, kg: string) => `${charge} up to ${kg} kg`,
	extra: (amount: string) => `+${amount} per extra kg`,
	freeFrom: (amount: string) => `Free over ${amount}`,
	emptyTitle: 'No delivery zones yet',
	emptyBody: 'Add one so shoppers can see what delivery costs. Start with Inside Dhaka.'
};

export const discountAdmin = {
	title: 'Discounts',
	description:
		'Codes shoppers type in their bag for money off. Set a minimum order, dates and how many times a code can be used.',
	add: 'Add a code',
	edit: 'Edit',
	editTitle: 'Edit code',
	save: 'Save',
	saved: 'Code saved',
	delete: 'Delete',
	deleteConfirm: 'Delete it?',
	deleted: 'Code deleted',
	code: 'Code',
	codeHint: 'Letters, numbers, - and _. Shoppers can type it in any case.',
	codePlaceholder: 'EID10',
	about: 'Shown to shoppers (optional)',
	aboutPlaceholder: '10% off for Eid',
	kind: 'Type',
	kinds: [
		{ value: 'percent', label: 'Percentage' },
		{ value: 'fixed', label: 'Amount' }
	],
	percent: 'Percentage off',
	amount: 'Amount off',
	cap: 'At most (optional)',
	capHint: 'The most a percentage can take off one order.',
	capPlaceholder: '500',
	min: 'Minimum order (optional)',
	minPlaceholder: '2000',
	starts: 'Starts (optional)',
	ends: 'Ends (optional)',
	limit: 'Times it can be used (optional)',
	limitHint: 'Across all orders. Leave empty for no limit.',
	limitPlaceholder: '100',
	active: 'On',
	off: 'Off',
	scheduled: 'Not started',
	ended: 'Ended',
	usedUp: 'Used up',
	takesOff: (p: string) => `${p} off`,
	upTo: (amount: string) => `up to ${amount}`,
	over: (amount: string) => `on orders over ${amount}`,
	from: (d: string) => `from ${d}`,
	until: (d: string) => `until ${d}`,
	used: (n: number, limit?: number | null) =>
		limit ? `Used ${n} of ${limit}` : `Used ${n} ${n === 1 ? 'time' : 'times'}`,
	emptyTitle: 'No discount codes yet',
	emptyBody: 'Add one, like EID10 for 10% off, and share it with your customers.'
};

export const reviewAdmin = {
	title: 'Reviews',
	description:
		'What customers wrote about your products. Hide a review that breaks your rules; it stops counting toward the rating.',
	hide: 'Hide',
	show: 'Show again',
	hidden: 'Hidden',
	hiddenToast: 'Review hidden',
	shownToast: 'Review shown again',
	noText: 'No words, just stars.',
	emptyTitle: 'No reviews yet',
	emptyBody: 'Reviews appear here as customers write them.'
};

export const questionAdmin = {
	title: 'Questions',
	description: 'Customers’ questions about products. Answered ones show on the product page.',
	waiting: 'Waiting',
	all: 'All',
	answer: 'Your answer',
	answerPlaceholder: 'Yes, it is 100% cotton and comes in sizes M to XXL.',
	post: 'Post answer',
	update: 'Update answer',
	hide: 'Hide',
	show: 'Show again',
	hidden: 'Hidden',
	answered: 'Answered',
	saved: 'Saved',
	emptyWaiting: 'No questions waiting',
	emptyAll: 'No questions yet',
	emptyBody: 'Questions appear here as customers ask them.'
};

export const orderCopy = {
	statuses: {
		pending: 'Placed',
		confirmed: 'Confirmed',
		packed: 'Packed',
		shipped: 'On the way',
		delivered: 'Delivered',
		cancelled: 'Cancelled'
	} as Record<string, string>,
	/** What the shop presses to move an order on. */
	moves: {
		confirmed: 'Confirm',
		packed: 'Mark packed',
		shipped: 'Mark shipped',
		delivered: 'Mark delivered',
		cancelled: 'Cancel order'
	} as Record<string, string>,
	number: (n: number) => `Order #${n}`,
	thanks: 'Thank you! Your order is placed.',
	thanksBody: 'We’ll call you to confirm it. You pay when it arrives.',
	keepLink: 'Keep this page’s link to check your order later.',
	items: 'Items',
	deliverTo: 'Deliver to',
	payment: 'Payment',
	cod: 'Cash on delivery',
	timeline: 'Order updates',
	subtotal: 'Subtotal',
	discount: (code: string) => `Discount (${code})`,
	delivery: (zone: string) => `Delivery · ${zone}`,
	vatAdded: (rate: string) => `VAT ${rate}`,
	vatIncluded: (rate: string, amount: string) => `Includes VAT ${rate}: ${amount}`,
	total: 'Total',
	qty: (n: number) => `× ${n}`,
	placedOn: (d: string) => `Placed on ${d}`,
	myOrders: 'My orders',
	noOrders: 'No orders yet',
	noOrdersBody: 'Your orders will show here once you place one.',
	itemCount: (n: number) => `${n} ${n === 1 ? 'item' : 'items'}`,
	view: 'View'
};

export const orderAdmin = {
	title: 'Orders',
	description:
		'Every order, newest first. Call to confirm, then move it on as it’s packed, shipped and delivered.',
	all: 'All',
	customer: 'Customer',
	placed: 'Placed',
	items: 'Items',
	total: 'Total',
	status: 'Status',
	more: 'Older orders',
	back: 'All orders',
	search: 'Search orders',
	searchButton: 'Search',
	searchPlaceholder: 'Order number, phone or name',
	noMatch: (q: string) => `No orders match “${q}”.`,
	note: 'Note (optional)',
	notePlaceholder: 'Called the customer, confirmed the address.',
	moved: (status: string) => `Order is now ${status.toLowerCase()}`,
	cancelConfirm: 'Cancel it?',
	done: 'Nothing more to do: this order is finished.',
	call: 'Call',
	emptyTitle: 'No orders here',
	emptyBody: 'Orders appear here as customers place them.'
};

export const customerAdmin = {
	title: 'Customers',
	description:
		'Everyone with an account, newest first. Guests have no account: find their orders by phone.',
	search: 'Search customers',
	searchButton: 'Search',
	searchPlaceholder: 'Name, email or phone',
	name: 'Customer',
	orders: 'Orders',
	spent: 'Spent',
	lastOrder: 'Last order',
	joined: 'Joined',
	never: 'No orders yet',
	disabled: 'Switched off',
	more: 'More customers',
	back: 'All customers',
	contact: 'Contact',
	noOrders: 'No orders yet.',
	noMatch: (q: string) => `No customers match “${q}”.`,
	emptyTitle: 'No customers yet',
	emptyBody: 'Customers appear here when they create an account.'
};

export const teamAdmin = {
	title: 'Team',
	description:
		'Who can work in this dashboard. Staff handle products, stock and orders; admins can also change settings and the team.',
	add: 'Add someone',
	name: 'Name',
	namePlaceholder: 'Nusrat Jahan',
	email: 'Email',
	emailHint: 'They sign in to the dashboard with this.',
	phone: 'Mobile number (optional)',
	role: 'Role',
	roles: [
		{ value: 'staff', label: 'Staff', description: 'Products, stock and orders' },
		{ value: 'admin', label: 'Admin', description: 'Everything, including settings and the team' }
	],
	password: 'Password',
	passwordHint: 'At least 12 characters. Give it to them yourself; they can’t reset it yet.',
	passwordPlaceholder: 'At least 12 characters',
	added: 'Added to the team',
	saved: 'Saved',
	you: 'You',
	off: 'Switched off',
	switchOff: 'Switch off',
	switchOffConfirm: 'Switch off?',
	switchOn: 'Switch back on',
	makeAdmin: 'Make admin',
	makeStaff: 'Make staff',
	roleLabel: { staff: 'Staff', admin: 'Admin' } as Record<string, string>
};

export const checkoutCopy = {
	title: 'Checkout',
	contact: 'Who receives it',
	name: 'Full name',
	namePlaceholder: 'Rahim Uddin',
	phone: 'Mobile number',
	phoneHint: 'The delivery person calls this number.',
	email: 'Email (optional)',
	emailHint: 'For a copy of your order.',
	address: 'Where to deliver',
	district: 'District',
	districtPlaceholder: 'Choose your district',
	searchDistricts: 'Search districts',
	noDistrict: 'No district by that name',
	area: 'Thana or area',
	areaPlaceholder: 'Mirpur 10',
	street: 'House, road and a landmark',
	streetPlaceholder: 'House 12, Road 3, near the school',
	note: 'Note for the shop (optional)',
	notePlaceholder: 'Call before coming; the gate is on the left.',
	payment: 'Payment',
	cod: 'Cash on delivery',
	codHint: 'Pay the delivery person when your order arrives.',
	due: (amount: string) => `${amount} on delivery`,
	summary: 'Your order',
	pickDistrict: 'Choose your district to see the delivery charge.',
	place: 'Place order',
	agree: 'By placing the order you agree to pay the total on delivery.',
	backToBag: 'Back to your bag'
};

export const delivery = {
	title: 'Delivery',
	to: 'Deliver to',
	choose: 'Choose your district',
	search: 'Search districts',
	noMatch: 'No district by that name',
	check: 'Check',
	charge: 'Delivery',
	free: 'Free',
	days: (d: string) => `Arrives in ${d}`,
	total: 'Total',
	notDeliverable: 'We don’t deliver to that district yet.',
	zones: 'Delivery charges',
	weight: 'Weight (g)'
};

export const slider = {
	previous: 'Previous slide',
	next: 'Next slide',
	goTo: (n: number) => `Show slide ${n}`,
	of: (i: number, n: number) => `${i} of ${n}`
};

/** Example values shown inside empty fields. */
/** Search inside long dropdowns. */
export const picker = {
	searchCategories: 'Search categories',
	noCategory: 'No category by that name'
};

export const ph = {
	apiKeyName: 'Accounting sync',
	shopName: 'Fajr Bazar',
	phone: '01712345678',
	email: 'hello@yourshop.com',
	bin: '000123456-0101',
	highlightTitle: 'Cash on delivery',
	highlightText: 'Pay when your order arrives',
	productName: 'Cotton Panjabi',
	description: 'Fabric, fit, size guide, how to care for it…',
	sku: 'PJ-001-M',
	brand: 'Aarong',
	note: 'Invoice 1042 from the supplier',
	freeOver: '3000',
	bannerAlt: 'Eid sale: 20% off panjabis',
	bannerLink: '/c/saree',
	categoryName: 'Saree',
	customerName: 'Rahim Uddin',
	customerEmail: 'you@example.com',
	newPassword: 'At least 8 characters',
	login: 'Email or 01712345678',
	password: 'Your password'
};
