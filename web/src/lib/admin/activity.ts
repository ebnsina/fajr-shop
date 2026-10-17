import type { components } from '#lib/api.js';

type Entry = components['schemas']['AuditEntry'];
type Snapshot = Record<string, unknown> | null | undefined;

const field = (s: Snapshot, key: string) => {
	const v = s?.[key];
	return typeof v === 'string' || typeof v === 'number' ? String(v) : '';
};
const orderMoves: Record<string, string> = {
	confirmed: 'Confirmed',
	packed: 'Packed',
	shipped: 'Shipped',
	delivered: 'Delivered',
	cancelled: 'Cancelled'
};

/** An audit entry in words, naming what it touched, with a link to it when there is one. */
export function describe(e: Entry): { text: string; href?: string } {
	const now = (e.after ?? null) as Snapshot;
	const was = (e.before ?? null) as Snapshot;
	const name = field(now, 'name') || field(was, 'name');
	const [kind, verb] = e.action.split('.');
	const did = verb === 'create' ? 'Added' : verb === 'delete' ? 'Removed' : 'Changed';
	switch (kind) {
		case 'order':
			return {
				text: `${orderMoves[verb] ?? 'Changed'} order #${e.entity_id}`,
				href: `/admin/orders/${e.entity_id}`
			};
		case 'product':
			return {
				text: `${did} product ${name}`.trim(),
				href: verb === 'delete' ? undefined : `/admin/products/${e.entity_id}`
			};
		case 'category':
			return { text: `${did} category ${name}`.trim(), href: '/admin/categories' };
		case 'banner':
			return { text: `${did} a banner`, href: '/admin/banners' };
		case 'shipping_zone':
			return { text: `${did} delivery zone ${name}`.trim(), href: '/admin/shipping' };
		case 'discount': {
			const code = field(now, 'code') || field(was, 'code');
			return { text: `${did} discount code ${code}`.trim(), href: '/admin/discounts' };
		}
		case 'staff':
			return {
				text: verb === 'add' ? `Added ${name} to the team` : `Changed ${name}’s access`,
				href: '/admin/settings/team'
			};
		case 'review': {
			const product = field(now?.product as Snapshot, 'name');
			const what = product ? ` of ${product}` : '';
			return {
				text: `${verb === 'hide' ? 'Hid' : 'Showed'} a review${what}`,
				href: '/admin/reviews'
			};
		}
		case 'question': {
			const product = field(now?.product as Snapshot, 'name');
			return {
				text: `Answered a question${product ? ` about ${product}` : ''}`,
				href: '/admin/questions'
			};
		}
		case 'store':
			return { text: 'Changed the store settings', href: '/admin/settings/store' };
		case 'api_key':
			return {
				text: `${verb === 'revoke' ? 'Revoked' : 'Created'} API key ${name}`.trim(),
				href: '/admin/settings/api-keys'
			};
	}
	return { text: e.action };
}
