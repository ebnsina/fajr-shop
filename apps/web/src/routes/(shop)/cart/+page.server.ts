import { fail } from '@sveltejs/kit';
import { view, addItem, setQty, removeItem } from '@fajr/core/cart';
import { quote } from '@fajr/core/orders';
import { currentCart, ensureCart } from '$lib/server/cart';
import type { Actions, PageServerLoad } from './$types';
import { titled } from '$lib/meta';

const EMPTY = { id: null, lines: [], subtotalMinor: 0, itemCount: 0 };

export const load: PageServerLoad = async ({ cookies, parent }) => {
	const { store } = await parent();
	const cartId = await currentCart(cookies);
	const cart = cartId ? await view(cartId) : EMPTY;
	// Delivery is quoted properly at checkout, once we know the district.
	const shipping = await quote(null, cart.subtotalMinor);
	return { cart, shipping, meta: { title: titled(store.name, 'Bag'), noindex: true } };
};

export const actions: Actions = {
	add: async ({ request, cookies }) => {
		const form = await request.formData();
		const variantId = String(form.get('variantId') ?? '');
		const qty = Number(form.get('qty') ?? 1);
		if (!variantId) return fail(400, { error: 'Choose an option first.' });

		const cartId = await ensureCart(cookies);
		const result = await addItem(cartId, variantId, qty);

		if (!result.ok) {
			return fail(409, {
				error:
					result.reason === 'unavailable'
						? result.available
							? `Only ${result.available} left.`
							: 'That option just sold out.'
						: 'That product is no longer available.'
			});
		}
		return { added: true };
	},

	qty: async ({ request, cookies }) => {
		const cartId = await currentCart(cookies);
		if (!cartId) return fail(400);
		const form = await request.formData();
		const result = await setQty(cartId, String(form.get('itemId')), Number(form.get('qty') ?? 1));
		if (!result.ok) {
			return fail(409, { error: result.available ? `Only ${result.available} left.` : 'That option just sold out.' });
		}
		return { updated: true };
	},

	remove: async ({ request, cookies }) => {
		const cartId = await currentCart(cookies);
		if (!cartId) return fail(400);
		const form = await request.formData();
		await removeItem(cartId, String(form.get('itemId')));
		return { removed: true };
	}
};
