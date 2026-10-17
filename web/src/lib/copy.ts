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
export const keyScopes: components['schemas']['ApiKeyScope'][] = ['store:write', 'audit:read'];

export const activity: Record<string, string> = {
	'store.update': 'Changed the store settings',
	'api_key.create': 'Created an API key',
	'api_key.revoke': 'Revoked an API key'
};

export const nav = {
	label: 'Shop dashboard',
	shop: 'Shop',
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
	saved: 'Store settings saved'
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
