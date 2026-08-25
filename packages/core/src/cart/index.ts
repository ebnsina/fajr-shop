import {
	db, cart, cartItem, variant, product, productMedia, media, newId, eq, and, sql, asc, inArray, lt
} from '@fajr/db';
import { newToken, hashToken } from '../auth/token.ts';
import { publicUrl } from '../media/storage.ts';

/** Long enough that a customer's cart survives a few days of thinking about it. */
export const CART_TTL_DAYS = 30;
/** How long a checkout may hold stock before the worker gives it back. */
export const RESERVATION_MINUTES = 15;

export type CartLine = {
	id: string;
	variantId: string;
	productId: string;
	slug: string;
	title: string;
	variantTitle: string | null;
	sku: string | null;
	imageUrl: string | null;
	unitPriceMinor: number;
	compareAtMinor: number | null;
	unitCostMinor: number | null;
	qty: number;
	/** Stock this line already holds from an in-flight checkout. */
	reservedQty: number;
	/** What this customer could take, counting what they already hold. */
	available: number;
	allowBackorder: boolean;
	totalMinor: number;
};

export type CartView = {
	id: string;
	lines: CartLine[];
	subtotalMinor: number;
	itemCount: number;
};

export async function createCart(customerId?: string | null): Promise<{ id: string; token: string }> {
	const token = newToken();
	const id = newId('crt');
	await db.write.insert(cart).values({ id, tokenHash: hashToken(token), customerId: customerId ?? null });
	return { id, token };
}

/** Resolves an existing open cart from its cookie token, or nothing. */
export async function cartFromToken(token: string | undefined | null): Promise<string | null> {
	if (!token) return null;
	const row = await db.read.query.cart.findFirst({
		where: and(eq(cart.tokenHash, hashToken(token)), eq(cart.status, 'open'))
	});
	return row?.id ?? null;
}

export type AddResult =
	| { ok: true; qty: number }
	| { ok: false; reason: 'unavailable' | 'not_found'; available?: number };

// Adding to the cart deliberately does NOT reserve stock — reserving on add-to-cart lets one
// abandoned browser session hold a flash sale hostage.
export async function addItem(cartId: string, variantId: string, qty = 1): Promise<AddResult> {
	const v = await db.read.query.variant.findFirst({ where: eq(variant.id, variantId) });
	if (!v || !v.isActive) return { ok: false, reason: 'not_found' };

	const existing = await db.read.query.cartItem.findFirst({
		where: and(eq(cartItem.cartId, cartId), eq(cartItem.variantId, variantId))
	});
	const wanted = (existing?.qty ?? 0) + qty;
	const available = v.stockOnHand - v.stockReserved;

	if (!v.allowBackorder && wanted > available) {
		return { ok: false, reason: 'unavailable', available: Math.max(0, available) };
	}

	if (existing) {
		await db.write.update(cartItem).set({ qty: wanted, updatedAt: new Date() }).where(eq(cartItem.id, existing.id));
	} else {
		await db.write.insert(cartItem).values({ id: newId('cli'), cartId, variantId, qty: wanted });
	}
	await touch(cartId);
	return { ok: true, qty: wanted };
}

export async function setQty(cartId: string, itemId: string, qty: number): Promise<AddResult> {
	if (qty <= 0) {
		await removeItem(cartId, itemId);
		return { ok: true, qty: 0 };
	}
	const line = await db.read.query.cartItem.findFirst({
		where: and(eq(cartItem.id, itemId), eq(cartItem.cartId, cartId))
	});
	if (!line) return { ok: false, reason: 'not_found' };

	const v = await db.read.query.variant.findFirst({ where: eq(variant.id, line.variantId) });
	if (!v) return { ok: false, reason: 'not_found' };

	const available = v.stockOnHand - v.stockReserved + line.reservedQty;
	if (!v.allowBackorder && qty > available) {
		return { ok: false, reason: 'unavailable', available: Math.max(0, available) };
	}

	await db.write.update(cartItem).set({ qty, updatedAt: new Date() }).where(eq(cartItem.id, itemId));
	await touch(cartId);
	return { ok: true, qty };
}

export async function removeItem(cartId: string, itemId: string): Promise<void> {
	const line = await db.read.query.cartItem.findFirst({
		where: and(eq(cartItem.id, itemId), eq(cartItem.cartId, cartId))
	});
	if (!line) return;
	if (line.reservedQty > 0) await releaseLine(line.id);
	await db.write.delete(cartItem).where(eq(cartItem.id, itemId));
	await touch(cartId);
}

const touch = (cartId: string) =>
	db.write.update(cart).set({ updatedAt: new Date() }).where(eq(cart.id, cartId));

/** One query per relation, never one per line. */
export async function view(cartId: string): Promise<CartView> {
	const lines = await db.read
		.select({
			id: cartItem.id,
			qty: cartItem.qty,
			reservedQty: cartItem.reservedQty,
			variantId: variant.id,
			sku: variant.sku,
			unitPriceMinor: variant.priceMinor,
			compareAtMinor: variant.compareAtMinor,
			unitCostMinor: variant.costMinor,
			stockOnHand: variant.stockOnHand,
			stockReserved: variant.stockReserved,
			allowBackorder: variant.allowBackorder,
			productId: product.id,
			title: product.title,
			slug: product.slug
		})
		.from(cartItem)
		.innerJoin(variant, eq(variant.id, cartItem.variantId))
		.innerJoin(product, eq(product.id, variant.productId))
		.where(eq(cartItem.cartId, cartId))
		.orderBy(asc(cartItem.createdAt));

	const productIds = [...new Set(lines.map((l) => l.productId))];
	const images = productIds.length
		? await db.read
				.select({ productId: productMedia.productId, key: media.key, position: productMedia.position })
				.from(productMedia)
				.innerJoin(media, eq(media.id, productMedia.mediaId))
				.where(inArray(productMedia.productId, productIds))
				.orderBy(asc(productMedia.position))
		: [];

	const variantIds = lines.map((l) => l.variantId);
	const titles = variantIds.length ? await variantTitles(variantIds) : new Map<string, string>();

	const out: CartLine[] = lines.map((l) => ({
		id: l.id,
		variantId: l.variantId,
		productId: l.productId,
		slug: l.slug,
		title: l.title,
		variantTitle: titles.get(l.variantId) ?? null,
		sku: l.sku,
		imageUrl: images.find((i) => i.productId === l.productId)?.key
			? publicUrl(images.find((i) => i.productId === l.productId)!.key)
			: null,
		unitPriceMinor: l.unitPriceMinor,
		compareAtMinor: l.compareAtMinor && l.compareAtMinor > l.unitPriceMinor ? l.compareAtMinor : null,
		unitCostMinor: l.unitCostMinor,
		qty: l.qty,
		reservedQty: l.reservedQty,
		available: l.stockOnHand - l.stockReserved + l.reservedQty,
		allowBackorder: l.allowBackorder,
		totalMinor: l.unitPriceMinor * l.qty
	}));

	return {
		id: cartId,
		lines: out,
		subtotalMinor: out.reduce((sum, l) => sum + l.totalMinor, 0),
		itemCount: out.reduce((sum, l) => sum + l.qty, 0)
	};
}

/** "Red / L" — rebuilt from the option values a variant is linked to. */
export async function variantTitles(variantIds: string[]): Promise<Map<string, string>> {
	const rows = (await db.read.execute(sql`
		select vov.variant_id, string_agg(ov.value, ' / ' order by o.position) as title
		from variant_option_value vov
		join option_value ov on ov.id = vov.option_value_id
		join option o on o.id = ov.option_id
		where vov.variant_id in ${sql`(${sql.join(variantIds.map((i) => sql`${i}`), sql`, `)})`}
		group by vov.variant_id
	`)) as unknown as { variant_id: string; title: string }[];
	return new Map(rows.map((r) => [r.variant_id, r.title]));
}

export type ReserveResult =
	| { ok: true }
	| { ok: false; failed: { lineId: string; title: string; available: number }[] };

// Called when checkout starts. Each line reserves with the atomic statement, so 200 people
// racing for 50 units is contention, not a lost sale for the winner.
export async function reserve(cartId: string): Promise<ReserveResult> {
	const current = await view(cartId);
	const held: { lineId: string; qty: number; variantId: string }[] = [];
	const failed: { lineId: string; title: string; available: number }[] = [];

	for (const line of current.lines) {
		// Only claim what isn't already held, so re-entering checkout is a no-op.
		const need = line.qty - line.reservedQty;
		if (need <= 0) continue;
		const rows = await db.write
			.update(variant)
			.set({ stockReserved: sql`${variant.stockReserved} + ${need}` })
			.where(
				and(
					eq(variant.id, line.variantId),
					sql`(${variant.allowBackorder} or ${variant.stockOnHand} - ${variant.stockReserved} >= ${need})`
				)
			)
			.returning({ id: variant.id });

		if (rows.length) {
			await db.write.update(cartItem).set({ reservedQty: need }).where(eq(cartItem.id, line.id));
			held.push({ lineId: line.id, qty: need, variantId: line.variantId });
		} else {
			failed.push({ lineId: line.id, title: line.title, available: Math.max(0, line.available) });
		}
	}

	if (failed.length) {
		for (const h of held) await releaseLine(h.lineId);
		return { ok: false, failed };
	}

	await db.write
		.update(cart)
		.set({ reservedUntil: new Date(Date.now() + RESERVATION_MINUTES * 60_000) })
		.where(eq(cart.id, cartId));

	return { ok: true };
}

export async function releaseLine(lineId: string): Promise<void> {
	const line = await db.read.query.cartItem.findFirst({ where: eq(cartItem.id, lineId) });
	if (!line || line.reservedQty <= 0) return;
	await db.write
		.update(variant)
		.set({ stockReserved: sql`greatest(0, ${variant.stockReserved} - ${line.reservedQty})` })
		.where(eq(variant.id, line.variantId));
	await db.write.update(cartItem).set({ reservedQty: 0 }).where(eq(cartItem.id, lineId));
}

export async function releaseCart(cartId: string): Promise<void> {
	const lines = await db.read.select({ id: cartItem.id }).from(cartItem).where(eq(cartItem.cartId, cartId));
	for (const l of lines) await releaseLine(l.id);
	await db.write.update(cart).set({ reservedUntil: null }).where(eq(cart.id, cartId));
}

/** Worker job: hand back stock from checkouts nobody finished. */
export async function releaseExpiredReservations(): Promise<number> {
	const stale = await db.read
		.select({ id: cart.id })
		.from(cart)
		.where(and(eq(cart.status, 'open'), lt(cart.reservedUntil, new Date())));
	for (const c of stale) await releaseCart(c.id);
	return stale.length;
}
