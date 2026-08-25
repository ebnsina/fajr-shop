import { redirect, fail } from '@sveltejs/kit';
import { superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import { checkoutFormFor, divisionOf, phoneFor, countryOf } from '@fajr/schemas';
import { evaluate as evaluateCoupon } from '@fajr/core/marketing';
import { view, reserve } from '@fajr/core/cart';
import { place, quote, setVerification } from '@fajr/core/orders';
import { assess, stampOrder } from '@fajr/core/risk';
import { isBlacklisted } from '@fajr/core/crm';
import { getSettings } from '@fajr/core/settings';
import { currentCart, clearCart } from '$lib/server/cart';
import { clientIp } from '$lib/server/session';
import type { Actions, PageServerLoad } from './$types';
import { titled } from '$lib/meta';

export const load: PageServerLoad = async ({ cookies, parent }) => {
	const { store } = await parent();
	const cartId = await currentCart(cookies);
	if (!cartId) redirect(303, '/cart');

	const cart = await view(cartId);
	if (cart.lines.length === 0) redirect(303, '/cart');

	// Hold the stock while they type their address. The worker gives it back
	// if they wander off, so an abandoned checkout can't strand inventory.
	await reserve(cartId);

	const form = await superValidate(zod(checkoutFormFor(store.country)), { errors: false });
	const shipping = await quote(null, cart.subtotalMinor);

	return {
		form,
		cart,
		shipping,
		// The shop's own country decides the address fields, or a Dubai customer
		// is asked to pick a Bangladeshi district.
		areas: countryOf(store.country).areas,
		country: store.country,
		areaLabel: countryOf(store.country).areaLabel,
		subAreaLabel: countryOf(store.country).subAreaLabel,
		meta: { title: titled(store.name, 'Checkout'), noindex: true }
	};
};

const COUPON_MESSAGES: Record<string, string> = {
	not_found: "That code doesn't exist.",
	inactive: 'That code is no longer active.',
	not_started: "That code isn't active yet.",
	expired: 'That code has expired.',
	used_up: 'That code has been fully used.',
	already_used: "You've already used that code.",
	below_minimum: 'Your order is below the minimum for that code.'
};

export const actions: Actions = {
	/** Checked without consuming it, so trying a code costs the customer nothing. */
	coupon: async ({ request, cookies }) => {
		const cartId = await currentCart(cookies);
		if (!cartId) return fail(400, { couponError: 'Your bag is empty.' });

		const form = await request.formData();
		const code = String(form.get('code') ?? '').trim();
		const cart = await view(cartId);

		// Normalise before checking, using this shop's own country rules.
		const settings = await getSettings();
		const phone = phoneFor(settings.country).safeParse(form.get('phone') ?? '');

		const result = await evaluateCoupon(code, {
			subtotalMinor: cart.subtotalMinor,
			shippingMinor: 0,
			phoneE164: phone.success ? phone.data : null
		});

		if (!result.ok) {
			// Intl, so the threshold reads in the shop's own currency rather than taka.
			const amount = new Intl.NumberFormat(`${settings.defaultLocale}-${settings.country}`, {
				style: 'currency',
				currency: settings.currency,
				maximumFractionDigits: 0
			});
			const message =
				result.reason === 'below_minimum' && result.minSubtotalMinor
					? `Spend ${amount.format(result.minSubtotalMinor / 100)} to use that code.`
					: (COUPON_MESSAGES[result.reason] ?? 'That code cannot be used.');
			return fail(400, { couponError: message, couponCode: code });
		}

		return { coupon: result.quote, couponCode: result.quote.code };
	},

	// Named, because a page cannot mix a default action with named ones and the
	// promo check needs its own.
	place: async ({ request, cookies, url, getClientAddress }) => {
		const cartId = await currentCart(cookies);
		if (!cartId) redirect(303, '/cart');

		const settings = await getSettings();
		const form = await superValidate(request, zod(checkoutFormFor(settings.country)));
		if (!form.valid) return fail(400, { form });

		const d = form.data;

		// A blocked number is a staff decision and outranks any score, so it is checked first.
		// The message never says "blocked" — that just teaches someone to try another number.
		if (await isBlacklisted(d.phone)) {
			return fail(403, {
				form,
				stockError: 'We cannot take an order from this number. Please call us to place your order.'
			});
		}

		const risk = await assess(d.phone, { ip: clientIp(request, getClientAddress()) });

		if (risk.action === 'require_advance' && d.paymentMethod === 'cod') {
			return fail(409, {
				form,
				// Never say "you look like a fraud". State the requirement.
				stockError:
					`Cash on delivery is not available for this number. Please pay with ${countryOf(settings.country).manualPayLabel} to place the order.`
			});
		}

		const result = await place({
			cartId,
			phoneE164: d.phone,
			name: d.name,
			address: {
				country: 'BD',
				division: divisionOf(d.district),
				district: d.district,
				thana: d.thana || null,
				area: d.area || null,
				detail: d.detail
			},
			paymentMethod: d.paymentMethod,
			couponCode: d.couponCode || null,
			note: d.note || null,
			// Which ad produced this order.
			attribution: {
				...Object.fromEntries([...url.searchParams].filter(([k]) => k.startsWith('utm_'))),
				...(cookies.get('_fbp') ? { fbp: cookies.get('_fbp')! } : {}),
				...(cookies.get('_fbc') ? { fbc: cookies.get('_fbc')! } : {})
			}
		});

		if (!result.ok) {
			if (result.reason === 'empty_cart') redirect(303, '/cart');
			if (result.reason === 'coupon_rejected') {
				return fail(409, {
					form,
					couponError: COUPON_MESSAGES[result.couponError ?? ''] ?? 'That code cannot be used.'
				});
			}
			return fail(409, {
				form,
				stockError: result.failed?.length
					? `${result.failed.map((f) => f.title).join(', ')} sold out while you were checking out.`
					: 'Something in your bag just sold out.'
			});
		}

		// The score at decision time, never recomputed later.
		await stampOrder(result.orderId, risk);

		// A proven customer skips the phone call entirely — that is the whole
		// point of scoring: fewer calls, not more rejections.
		if (risk.action === 'auto_confirm') {
			await setVerification(result.orderId, 'confirmed', { type: 'system' }, risk.reason);
		}

		clearCart(cookies);
		redirect(303, `/order/${result.publicCode}?p=${encodeURIComponent(d.phone)}`);
	}
};
