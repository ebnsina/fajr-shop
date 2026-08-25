import {
	db, cart, cartItem, variant, product, order, orderItem, orderEvent, payment, address,
	customer, outbox, newId, newPublicCode, eq, and, sql, desc, asc, inArray
} from '@fajr/db';
import { view as cartView, variantTitles, releaseCart } from '../cart/index.ts';
import { quote, type Quote } from './shipping.ts';
import { evaluate as evaluateCoupon, redeem as redeemCoupon, release as releaseCoupon } from '../marketing/coupons.ts';
import { audit } from '../audit/index.ts';

export { quote, type Quote };

export type PlaceInput = {
	cartId: string;
	phoneE164: string;
	name: string;
	email?: string | null;
	address: {
		country?: string;
		division?: string | null;
		district?: string | null;
		thana?: string | null;
		area?: string | null;
		detail: string;
		postcode?: string | null;
	};
	paymentMethod?: 'cod' | 'bkash_manual';
	note?: string | null;
	attribution?: Record<string, string> | null;
	currency?: string;
	couponCode?: string | null;
};

export type PlaceResult =
	| { ok: true; orderId: string; publicCode: string; totalMinor: number; advanceMinor: number }
	| { ok: false; reason: 'empty_cart' | 'stock_changed' | 'coupon_rejected'; failed?: { title: string; available: number }[]; couponError?: string };

// The whole money path, in one transaction: reserve stock atomically, snapshot every line,
// write the order, and enqueue the side effects as outbox rows.
export async function place(input: PlaceInput): Promise<PlaceResult> {
	const current = await cartView(input.cartId);
	if (current.lines.length === 0) return { ok: false, reason: 'empty_cart' };

	const titles = await variantTitles(current.lines.map((l) => l.variantId));
	const shipping = await quote(input.address.district, current.subtotalMinor);
	const currency = input.currency ?? 'BDT';

	// The coupon is re-evaluated here rather than trusted from the form. A price posted by the
	// browser is a price the browser chose.
	let discountMinor = 0;
	let couponCode: string | null = null;

	if (input.couponCode?.trim()) {
		const result = await evaluateCoupon(input.couponCode, {
			subtotalMinor: current.subtotalMinor,
			shippingMinor: shipping.shippingMinor,
			phoneE164: input.phoneE164
		});
		if (!result.ok) return { ok: false, reason: 'coupon_rejected', couponError: result.reason };
		discountMinor = result.quote.discountMinor;
		couponCode = result.quote.code;
	}

	const orderId = newId('ord');
	const publicCode = newPublicCode();
	const failed: { title: string; available: number }[] = [];

	const result = await db.write.transaction(async (tx) => {
		// Claim stock inside the transaction. Zero rows back means someone else
		// took the last one between browsing and paying.
		for (const line of current.lines) {
			const need = line.qty - line.reservedQty;
			if (need > 0) {
				const claimed = await tx
					.update(variant)
					.set({ stockReserved: sql`${variant.stockReserved} + ${need}` })
					.where(
						and(
							eq(variant.id, line.variantId),
							sql`(${variant.allowBackorder} or ${variant.stockOnHand} - ${variant.stockReserved} >= ${need})`
						)
					)
					.returning({ id: variant.id });

				if (!claimed.length) {
					failed.push({ title: line.title, available: Math.max(0, line.available) });
				}
			}
		}
		if (failed.length) {
			tx.rollback();
			return null;
		}

		const addressId = newId('adr');
		await tx.insert(address).values({
			id: addressId,
			name: input.name,
			phoneE164: input.phoneE164,
			country: input.address.country ?? 'BD',
			division: input.address.division ?? null,
			district: input.address.district ?? null,
			thana: input.address.thana ?? null,
			area: input.address.area ?? null,
			detail: input.address.detail,
			postcode: input.address.postcode ?? null
		});

		const subtotal = current.subtotalMinor;
		const total = Math.max(0, subtotal + shipping.shippingMinor - discountMinor);

		await tx.insert(order).values({
			id: orderId,
			publicCode,
			phoneE164: input.phoneE164,
			email: input.email ?? null,
			currency,
			subtotalMinor: subtotal,
			shippingMinor: shipping.shippingMinor,
			discountMinor,
			couponCode,
			totalMinor: total,
			advanceMinor: input.paymentMethod === 'bkash_manual' ? total : shipping.advanceMinor,
			paymentMethod: input.paymentMethod ?? 'cod',
			shippingAddressId: addressId,
			note: input.note ?? null,
			attribution: input.attribution ?? null
		});

		for (const line of current.lines) {
			await tx.insert(orderItem).values({
				id: newId('oit'),
				orderId,
				variantId: line.variantId,
				productId: line.productId,
				title: line.title,
				variantTitle: titles.get(line.variantId) ?? null,
				sku: line.sku,
				imageUrl: line.imageUrl,
				unitPriceMinor: line.unitPriceMinor,
				qty: line.qty,
				totalMinor: line.totalMinor,
				unitCostMinor: line.unitCostMinor
			});
		}

		// Claimed after the order row exists, because a redemption references it.
		if (couponCode) {
			const claimed = await redeemCoupon(tx, {
				code: couponCode,
				orderId,
				phoneE164: input.phoneE164,
				amountMinor: discountMinor
			});
			if (!claimed) {
				tx.rollback();
				return null;
			}
		}

		await tx.insert(payment).values({
			id: newId('pay'),
			orderId,
			provider: input.paymentMethod === 'bkash_manual' ? 'bkash_manual' : 'cod',
			amountMinor: input.paymentMethod === 'bkash_manual' ? total : shipping.advanceMinor,
			status: 'pending',
			idempotencyKey: `order:${orderId}:initial`
		});

		await tx.insert(orderEvent).values({
			id: newId('oev'),
			orderId,
			type: 'placed',
			message: `Order placed · ${input.paymentMethod ?? 'cod'}`,
			actorType: 'customer'
		});

		// Side effects are rows, written in the same transaction as the order.
		await tx.insert(outbox).values([
			{
				id: newId('obx'),
				topic: 'order.placed',
				payload: { orderId, publicCode, phoneE164: input.phoneE164, totalMinor: total },
				idempotencyKey: orderId
			},
			// COD is the majority of BD orders, and placing one *is* the sale as far as ad attribution
			// is concerned.
			{
				id: newId('obx'),
				topic: 'order.purchased',
				payload: { orderId },
				idempotencyKey: orderId
			}
		]);

		await tx.update(cart).set({ status: 'ordered', reservedUntil: null }).where(eq(cart.id, input.cartId));
		await tx.update(cartItem).set({ reservedQty: 0 }).where(eq(cartItem.cartId, input.cartId));

		return { total, advance: input.paymentMethod === 'bkash_manual' ? total : shipping.advanceMinor };
	}).catch((err) => {
		// A rollback we asked for is expected; anything else is a real fault and
		// must not be reported to the customer as a coupon problem.
		if (!String(err).includes('Rollback')) {
			console.error(JSON.stringify({ t: new Date().toISOString(), placeFailed: String(err) }));
			throw err;
		}
		return null;
	});

	if (!result) {
		// Either stock moved or the coupon ran out between check and claim.
		return failed.length
			? { ok: false, reason: 'stock_changed', failed }
			: { ok: false, reason: 'coupon_rejected', couponError: 'used_up' };
	}

	return { ok: true, orderId, publicCode, totalMinor: result.total, advanceMinor: result.advance };
}

// ── transitions ─────────────────────────────────────────────────────────────

export type Actor = { type: 'admin' | 'customer' | 'system' | 'agent'; id?: string | null };

async function record(orderId: string, type: string, message: string | null, actor: Actor, meta?: Record<string, unknown>) {
	await db.write.insert(orderEvent).values({
		id: newId('oev'),
		orderId,
		type,
		message,
		actorType: actor.type,
		actorId: actor.id ?? null,
		meta: meta ?? null
	});
}

export async function setVerification(
	orderId: string,
	status: 'pending' | 'called' | 'confirmed' | 'cancelled' | 'unreachable',
	actor: Actor,
	note?: string
): Promise<void> {
	await db.write
		.update(order)
		.set({
			verificationStatus: status,
			verifiedBy: actor.id ?? null,
			verifiedAt: new Date(),
			// Confirming the call is what moves a COD order out of pending.
			...(status === 'confirmed' ? { status: 'confirmed' as const } : {}),
			updatedAt: new Date()
		})
		.where(eq(order.id, orderId));

	await record(orderId, `verification.${status}`, note ?? null, actor);
	if (status === 'cancelled') await cancel(orderId, note ?? 'Cancelled on verification call', actor);
}

/** Cancelling hands the stock back — that's the whole point of reserving. */
export async function cancel(orderId: string, reason: string, actor: Actor): Promise<void> {
	const items = await db.read.select().from(orderItem).where(eq(orderItem.orderId, orderId));
	const row = await db.read.query.order.findFirst({ where: eq(order.id, orderId) });
	if (!row || row.status === 'cancelled') return;

	await db.write.transaction(async (tx) => {
		for (const item of items) {
			if (!item.variantId) continue;
			// Shipped goods are gone; only un-dispatched reservations come back.
			if (row.status === 'shipped' || row.status === 'delivered') continue;
			await tx
				.update(variant)
				.set({ stockReserved: sql`greatest(0, ${variant.stockReserved} - ${item.qty})` })
				.where(eq(variant.id, item.variantId));
		}
		await tx
			.update(order)
			.set({ status: 'cancelled', cancelReason: reason, updatedAt: new Date() })
			.where(eq(order.id, orderId));
	});

	// A cancelled order hands its coupon use back, like it hands the stock back.
	await releaseCoupon(orderId);

	await record(orderId, 'cancelled', reason, actor);
	await audit({ actorType: actor.type, actorId: actor.id, action: 'order.cancel', entity: 'order', entityId: orderId, meta: { reason } });
}

/** Dispatch turns held stock into sold stock. */
export async function markShipped(orderId: string, actor: Actor, meta?: Record<string, unknown>): Promise<void> {
	const items = await db.read.select().from(orderItem).where(eq(orderItem.orderId, orderId));

	await db.write.transaction(async (tx) => {
		for (const item of items) {
			if (!item.variantId) continue;
			await tx
				.update(variant)
				.set({
					stockOnHand: sql`${variant.stockOnHand} - ${item.qty}`,
					stockReserved: sql`greatest(0, ${variant.stockReserved} - ${item.qty})`
				})
				.where(eq(variant.id, item.variantId));
		}
		await tx.update(order).set({ status: 'shipped', updatedAt: new Date() }).where(eq(order.id, orderId));
		await tx.insert(outbox).values({
			id: newId('obx'),
			topic: 'order.shipped',
			payload: { orderId },
			idempotencyKey: `${orderId}:shipped`
		});
	});

	await record(orderId, 'shipped', null, actor, meta);
}

export async function markDelivered(orderId: string, actor: Actor): Promise<void> {
	await db.write
		.update(order)
		.set({ status: 'delivered', paymentStatus: 'paid', updatedAt: new Date() })
		.where(eq(order.id, orderId));
	await record(orderId, 'delivered', 'COD collected on delivery', actor);
}

// Manual bKash: the customer sends money and types the trxID; staff confirm it against the
// bKash app before dispatch.
export async function recordManualPayment(
	orderId: string,
	input: { reference: string; amountMinor: number; provider?: 'bkash_manual' },
	actor: Actor
): Promise<{ ok: boolean; duplicate?: boolean }> {
	const provider = input.provider ?? 'bkash_manual';
	const key = `${orderId}:${input.reference.trim().toUpperCase()}`;

	const inserted = await db.write
		.insert(payment)
		.values({
			id: newId('pay'),
			orderId,
			provider,
			amountMinor: input.amountMinor,
			status: 'verifying',
			reference: input.reference.trim().toUpperCase(),
			idempotencyKey: key
		})
		.onConflictDoNothing({ target: [payment.provider, payment.idempotencyKey] })
		.returning({ id: payment.id });

	if (!inserted.length) return { ok: true, duplicate: true };

	await record(orderId, 'payment.submitted', `bKash ${input.reference}`, actor, { amountMinor: input.amountMinor });
	return { ok: true };
}

export async function confirmPayment(paymentId: string, actor: Actor): Promise<void> {
	const row = await db.read.query.payment.findFirst({ where: eq(payment.id, paymentId) });
	if (!row || row.status === 'succeeded') return;

	await db.write.transaction(async (tx) => {
		await tx
			.update(payment)
			.set({ status: 'succeeded', paidAt: new Date(), verifiedBy: actor.id ?? null })
			.where(eq(payment.id, paymentId));

		const o = await tx.query.order.findFirst({ where: eq(order.id, row.orderId) });
		if (!o) return;
		const paid = o.paidMinor + row.amountMinor;
		await tx
			.update(order)
			.set({
				paidMinor: paid,
				paymentStatus: paid >= o.totalMinor ? 'paid' : 'advance_paid',
				updatedAt: new Date()
			})
			.where(eq(order.id, row.orderId));
	});

	await record(row.orderId, 'payment.confirmed', row.reference, actor, { amountMinor: row.amountMinor });
}

// ── reads ───────────────────────────────────────────────────────────────────

export async function getOrder(idOrCode: string) {
	const row = await db.read.query.order.findFirst({
		where: idOrCode.startsWith('ord_') ? eq(order.id, idOrCode) : eq(order.publicCode, idOrCode.toUpperCase())
	});
	if (!row) return null;

	const [items, events, payments, addr] = await Promise.all([
		db.read.select().from(orderItem).where(eq(orderItem.orderId, row.id)),
		db.read.select().from(orderEvent).where(eq(orderEvent.orderId, row.id)).orderBy(asc(orderEvent.createdAt)),
		db.read.select().from(payment).where(eq(payment.orderId, row.id)).orderBy(asc(payment.createdAt)),
		row.shippingAddressId
			? db.read.query.address.findFirst({ where: eq(address.id, row.shippingAddressId) })
			: Promise.resolve(undefined)
	]);

	return { ...row, items, events, payments, address: addr ?? null };
}

export type OrderFilter = {
	status?: string;
	verificationStatus?: string;
	search?: string;
	limit?: number;
	offset?: number;
};

export async function listOrders(filter: OrderFilter = {}) {
	const where = [];
	if (filter.status) where.push(eq(order.status, filter.status as 'pending'));
	if (filter.verificationStatus) where.push(eq(order.verificationStatus, filter.verificationStatus as 'pending'));
	if (filter.search?.trim()) {
		const q = `%${filter.search.trim()}%`;
		where.push(sql`(${order.publicCode} ilike ${q} or ${order.phoneE164} ilike ${q})`);
	}
	const clause = where.length ? and(...where) : undefined;
	const limit = Math.min(filter.limit ?? 50, 200);

	const [rows, counted] = await Promise.all([
		// A join and a group-by, not a correlated subquery: drizzle renders an interpolated column
		// as.
		db.read
			.select({
				id: order.id,
				publicCode: order.publicCode,
				phoneE164: order.phoneE164,
				status: order.status,
				paymentStatus: order.paymentStatus,
				verificationStatus: order.verificationStatus,
				totalMinor: order.totalMinor,
				currency: order.currency,
				riskBand: order.riskBand,
				placedAt: order.placedAt,
				itemCount: sql<number>`coalesce(sum(${orderItem.qty}), 0)`
			})
			.from(order)
			.leftJoin(orderItem, eq(orderItem.orderId, order.id))
			.where(clause)
			.groupBy(order.id)
			.orderBy(desc(order.placedAt))
			.limit(limit)
			.offset(filter.offset ?? 0),
		db.read.select({ n: sql<number>`count(*)` }).from(order).where(clause)
	]);

	return { rows, total: Number(counted[0]?.n ?? 0) };
}

/** Public tracking: phone plus code, so no login and no enumeration. */
export async function trackOrder(publicCode: string, phoneE164: string) {
	const row = await db.read.query.order.findFirst({
		where: and(eq(order.publicCode, publicCode.trim().toUpperCase()), eq(order.phoneE164, phoneE164))
	});
	if (!row) return null;
	const items = await db.read.select().from(orderItem).where(eq(orderItem.orderId, row.id));
	return {
		publicCode: row.publicCode,
		status: row.status,
		placedAt: row.placedAt,
		totalMinor: row.totalMinor,
		currency: row.currency,
		items: items.map((i) => ({ title: i.title, variantTitle: i.variantTitle, qty: i.qty }))
	};
}
