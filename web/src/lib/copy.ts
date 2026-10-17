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

export const activity: Record<string, string> = {
	'store.update': 'Changed the store settings',
	'api_key.create': 'Created an API key',
	'api_key.revoke': 'Revoked an API key',
	'category.create': 'Added a category',
	'category.update': 'Changed a category',
	'category.delete': 'Removed a category',
	'product.create': 'Added a product',
	'product.update': 'Changed a product',
	'product.delete': 'Removed a product',
	'banner.create': 'Added a banner',
	'banner.update': 'Changed a banner',
	'banner.delete': 'Removed a banner'
};

export const nav = {
	label: 'Shop dashboard',
	overview: 'Overview',
	shop: 'Shop',
	catalog: 'Catalog',
	products: 'Products',
	categories: 'Categories',
	banners: 'Banners',
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
	inStockOnly: 'In stock only',
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

export const productPage = {
	soldOut: 'Sold out',
	notOffered: 'Not available in this combination',
	description: 'About this product'
};

export const cart = {
	bag: 'Your bag',
	open: (n: number) => (n ? `Bag, ${n} ${n === 1 ? 'item' : 'items'}` : 'Bag, empty'),
	add: 'Add to bag',
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
	title: 'Your bag'
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
	off: (pct: number) => `${pct}% off`,
	bottomNav: 'Shop sections',
	home: 'Home',
	bag: 'Bag',
	help: 'Help',
	shop: 'Shop',
	contact: 'Contact us',
	cod: 'Cash on delivery available',
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
	ordersSoon: 'Your orders will appear here after you buy something.',
	shopNow: 'Start shopping',
	hello: (name: string) => `Hello, ${name.split(' ')[0]}`
};

export const home = {
	recommended: 'Recommended for you',
	tabs: { newest: 'New arrivals', sale: 'On sale', featured: 'Featured' },
	brands: 'Top brands',
	products: (n: number) => `${n} ${n === 1 ? 'product' : 'products'}`,
	newsletterTitle: 'Subscribe to our newsletter',
	newsletterText: 'News about sales and new arrivals. No spam; leave any time.',
	newsletterEmail: 'Your email',
	newsletterButton: 'Subscribe',
	newsletterThanks: 'Thank you. You’re on the list.',
	backHome: 'Back to the shop'
};

export const overview = {
	title: 'Overview',
	description: 'How your shop is doing at a glance.',
	addProduct: 'Add a product',
	addBanner: 'Add a banner',
	forSale: 'Products for sale',
	drafts: 'Drafts',
	soldOut: 'Sold-out variants',
	categories: 'Categories',
	subscribers: 'Newsletter sign-ups',
	lowStock: 'Running low',
	lowStockNone: 'Nothing is running low.',
	product: 'Product',
	left: 'Left',
	recent: 'Recent activity',
	recentNone: 'Nothing has happened yet.',
	allActivity: 'All activity',
	system: 'The system'
};
