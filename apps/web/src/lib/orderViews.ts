// Saved views, not a filter builder. The common job should be one click, not a set of dropdowns
// rebuilt every morning.
export const ORDER_VIEWS = [
	{ key: 'all', filter: {} },
	{ key: 'to-call', filter: { verificationStatus: 'pending' } },
	{ key: 'confirmed', filter: { status: 'confirmed' } },
	{ key: 'to-ship', filter: { status: 'processing' } },
	{ key: 'shipped', filter: { status: 'shipped' } },
	{ key: 'cancelled', filter: { status: 'cancelled' } }
] as const;

/** Labels are resolved in the component, so they follow the staff member's language. */
export const ORDER_VIEW_KEYS = ORDER_VIEWS.map((v) => v.key);

export type OrderView = (typeof ORDER_VIEWS)[number];
