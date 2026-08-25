import {
	pgTable, text, integer, boolean, jsonb, index, uniqueIndex
} from 'drizzle-orm/pg-core';
import { tsCol, timestamps } from './common.ts';
import { customer } from './auth.ts';
import { product, variant } from './catalog.ts';

// Carts live in Postgres, not memory — any request must be servable by any process.
export const cart = pgTable(
	'cart',
	{
		id: text().primaryKey(),
		tokenHash: text('token_hash').notNull(),
		customerId: text().references(() => customer.id, { onDelete: 'set null' }),
		/** Captured as soon as it is typed at checkout, so an abandoned cart has
		 *  somebody to remind. Null until then. */
		phoneE164: text('phone_e164'),
		/** Set once a recovery message has gone out, so it only goes out once. */
		recoveredAt: tsCol('recovered_at'),
		status: text({ enum: ['open', 'ordered', 'abandoned'] })
			.notNull()
			.default('open'),
		/** Set when checkout starts; the worker releases reservations past it. */
		reservedUntil: tsCol('reserved_until'),
		...timestamps
	},
	(t) => [
		uniqueIndex('cart_token_idx').on(t.tokenHash),
		index('cart_stale_idx').on(t.status, t.reservedUntil),
		index('cart_abandoned_idx').on(t.status, t.recoveredAt, t.updatedAt)
	]
);

export const cartItem = pgTable(
	'cart_item',
	{
		id: text().primaryKey(),
		cartId: text()
			.notNull()
			.references(() => cart.id, { onDelete: 'cascade' }),
		variantId: text()
			.notNull()
			.references(() => variant.id, { onDelete: 'cascade' }),
		qty: integer().notNull().default(1),
		/** Held stock for this line, so releasing is exact rather than inferred. */
		reservedQty: integer('reserved_qty').notNull().default(0),
		...timestamps
	},
	(t) => [uniqueIndex('cart_item_variant_idx').on(t.cartId, t.variantId)]
);

// BD addresses are division → district → thana → area, not state/zip. `country` and `fields`
// keep a Gulf address shape possible without a migration.
export const address = pgTable(
	'address',
	{
		id: text().primaryKey(),
		customerId: text().references(() => customer.id, { onDelete: 'cascade' }),
		name: text().notNull(),
		phoneE164: text('phone_e164').notNull(),
		country: text().notNull().default('BD'),
		division: text(),
		district: text(),
		thana: text(),
		area: text(),
		/** House, road, landmark — the part couriers actually navigate by. */
		detail: text().notNull(),
		postcode: text(),
		fields: jsonb().$type<Record<string, string>>(),
		isDefault: boolean().notNull().default(false),
		...timestamps
	},
	(t) => [index('address_customer_idx').on(t.customerId)]
);

/** Per-district delivery charge. Two zones covers most BD shops on day one. */
export const shippingZone = pgTable('shipping_zone', {
	id: text().primaryKey(),
	name: text().notNull(),
	/** Empty means "everywhere not matched by another zone". */
	districts: text().array().notNull().default([]),
	chargeMinor: integer('charge_minor').notNull(),
	freeOverMinor: integer('free_over_minor'),
	/** COD advance to collect up front — the delivery charge, usually. */
	advanceMinor: integer('advance_minor').notNull().default(0),
	sort: integer().notNull().default(0),
	isActive: boolean().notNull().default(true),
	...timestamps
});

export const order = pgTable(
	'order',
	{
		id: text().primaryKey(),
		// Short random code shown to customers and couriers. Never sequential — that would tell any
		// competitor the shop's monthly order count.
		publicCode: text('public_code').notNull(),
		customerId: text().references(() => customer.id, { onDelete: 'set null' }),
		/** The identity that matters in BD. Present even for guest checkout. */
		phoneE164: text('phone_e164').notNull(),
		email: text(),

		status: text({ enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned'] })
			.notNull()
			.default('pending'),
		paymentStatus: text('payment_status', { enum: ['unpaid', 'advance_paid', 'paid', 'refunded', 'partially_refunded'] })
			.notNull()
			.default('unpaid'),

		/** BD shops phone-confirm nearly every COD order. This is a queue, not a note. */
		verificationStatus: text('verification_status', { enum: ['pending', 'called', 'confirmed', 'cancelled', 'unreachable'] })
			.notNull()
			.default('pending'),
		verifiedBy: text('verified_by'),
		verifiedAt: tsCol('verified_at'),

		/** Snapshot at decision time, never recomputed. */
		riskScore: integer('risk_score'),
		riskBand: text('risk_band', { enum: ['low', 'medium', 'high', 'unknown'] }),

		currency: text().notNull().default('BDT'),
		subtotalMinor: integer('subtotal_minor').notNull(),
		discountMinor: integer('discount_minor').notNull().default(0),
		couponCode: text('coupon_code'),
		shippingMinor: integer('shipping_minor').notNull().default(0),
		taxMinor: integer('tax_minor').notNull().default(0),
		totalMinor: integer('total_minor').notNull(),
		/** Prepaid portion required before dispatch (delivery charge, or all of it). */
		advanceMinor: integer('advance_minor').notNull().default(0),
		paidMinor: integer('paid_minor').notNull().default(0),

		paymentMethod: text('payment_method', { enum: ['cod', 'bkash_manual', 'sslcommerz'] })
			.notNull()
			.default('cod'),

		shippingAddressId: text().references(() => address.id),
		note: text(),
		staffNote: text('staff_note'),
		/** Which ad or landing page produced this — see the campaign pages in §8. */
		attribution: jsonb().$type<Record<string, string>>(),
		cancelReason: text('cancel_reason'),
		placedAt: tsCol('placed_at').notNull().defaultNow(),
		...timestamps
	},
	(t) => [
		uniqueIndex('order_code_idx').on(t.publicCode),
		index('order_phone_idx').on(t.phoneE164),
		index('order_status_idx').on(t.status, t.placedAt),
		index('order_verification_idx').on(t.verificationStatus, t.placedAt)
	]
);

// Every line snapshots what was sold. Titles and prices change; an invoice from last March must
// still say what last March said.
export const orderItem = pgTable(
	'order_item',
	{
		id: text().primaryKey(),
		orderId: text()
			.notNull()
			.references(() => order.id, { onDelete: 'cascade' }),
		variantId: text().references(() => variant.id, { onDelete: 'set null' }),
		productId: text().references(() => product.id, { onDelete: 'set null' }),
		title: text().notNull(),
		variantTitle: text('variant_title'),
		sku: text(),
		imageUrl: text('image_url'),
		unitPriceMinor: integer('unit_price_minor').notNull(),
		qty: integer().notNull(),
		totalMinor: integer('total_minor').notNull(),
		/** For margin reporting; never shown to the customer. */
		unitCostMinor: integer('unit_cost_minor')
	},
	(t) => [index('order_item_order_idx').on(t.orderId)]
);

export const payment = pgTable(
	'payment',
	{
		id: text().primaryKey(),
		orderId: text()
			.notNull()
			.references(() => order.id, { onDelete: 'cascade' }),
		provider: text({ enum: ['cod', 'bkash_manual', 'sslcommerz'] }).notNull(),
		amountMinor: integer('amount_minor').notNull(),
		status: text({ enum: ['pending', 'verifying', 'succeeded', 'failed', 'refunded'] })
			.notNull()
			.default('pending'),
		/** bKash trxID, or the gateway's transaction reference. */
		reference: text(),
		// Every provider retries. A unique key plus an upsert is the difference between a retry and a
		// double charge.
		idempotencyKey: text('idempotency_key').notNull(),
		raw: jsonb().$type<Record<string, unknown>>(),
		verifiedBy: text('verified_by'),
		paidAt: tsCol('paid_at'),
		...timestamps
	},
	(t) => [
		uniqueIndex('payment_idem_idx').on(t.provider, t.idempotencyKey),
		index('payment_order_idx').on(t.orderId),
		index('payment_reference_idx').on(t.reference)
	]
);

/** Append-only history behind the order timeline in admin. */
export const orderEvent = pgTable(
	'order_event',
	{
		id: text().primaryKey(),
		orderId: text()
			.notNull()
			.references(() => order.id, { onDelete: 'cascade' }),
		type: text().notNull(),
		message: text(),
		actorType: text({ enum: ['admin', 'customer', 'system', 'agent'] }).notNull(),
		actorId: text(),
		meta: jsonb().$type<Record<string, unknown>>(),
		createdAt: tsCol('created_at').notNull().defaultNow()
	},
	(t) => [index('order_event_order_idx').on(t.orderId, t.createdAt)]
);

// Cached courier-history lookups.
export const fraudCheck = pgTable(
	'fraud_check',
	{
		id: text().primaryKey(),
		phoneE164: text('phone_e164').notNull(),
		provider: text().notNull(),
		delivered: integer().notNull().default(0),
		returned: integer().notNull().default(0),
		/** 0–100. Higher is worse. */
		score: integer().notNull(),
		band: text({ enum: ['low', 'medium', 'high', 'unknown'] }).notNull(),
		/** The raw provider payload, so admin can show the per-courier breakdown. */
		raw: jsonb().$type<Record<string, unknown>>(),
		checkedAt: tsCol('checked_at').notNull().defaultNow()
	},
	(t) => [
		index('fraud_phone_idx').on(t.phoneE164, t.checkedAt),
		uniqueIndex('fraud_phone_provider_idx').on(t.phoneE164, t.provider)
	]
);

/** Outbound SMS, one row per attempt, keyed so a retry can't double-send. */
export const message = pgTable(
	'message',
	{
		id: text().primaryKey(),
		channel: text({ enum: ['sms', 'whatsapp', 'push', 'email'] }).notNull(),
		toAddress: text('to_address').notNull(),
		template: text().notNull(),
		body: text().notNull(),
		status: text({ enum: ['queued', 'sent', 'failed'] })
			.notNull()
			.default('queued'),
		provider: text(),
		providerRef: text('provider_ref'),
		error: text(),
		idempotencyKey: text('idempotency_key').notNull(),
		orderId: text().references(() => order.id, { onDelete: 'set null' }),
		sentAt: tsCol('sent_at'),
		...timestamps
	},
	(t) => [
		uniqueIndex('message_idem_idx').on(t.channel, t.idempotencyKey),
		index('message_order_idx').on(t.orderId)
	]
);

/** A batch payment from a courier, covering many parcels. */
export const courierSettlement = pgTable(
	'courier_settlement',
	{
		id: text().primaryKey(),
		courier: text().notNull(),
		/** The courier's payout reference, from their statement. */
		reference: text().notNull(),
		/** What they say they paid. Reconciliation compares this to the parcels. */
		amountMinor: integer('amount_minor').notNull(),
		feeMinor: integer('fee_minor').notNull().default(0),
		settledAt: tsCol('settled_at').notNull(),
		note: text(),
		...timestamps
	},
	(t) => [uniqueIndex('settlement_ref_idx').on(t.courier, t.reference)]
);

// One parcel with one courier.
export const shipment = pgTable(
	'shipment',
	{
		id: text().primaryKey(),
		orderId: text()
			.notNull()
			.references(() => order.id, { onDelete: 'cascade' }),
		courier: text().notNull(),
		/** The courier's own id for this parcel. Unique per courier, not globally. */
		consignmentId: text('consignment_id'),
		trackingCode: text('tracking_code'),
		status: text({
			enum: ['pending', 'pushed', 'picked', 'in_transit', 'delivered', 'returned', 'lost', 'cancelled']
		})
			.notNull()
			.default('pending'),
		/** What the courier must collect on our behalf. Zero for prepaid orders. */
		codAmountMinor: integer('cod_amount_minor').notNull().default(0),
		// COD money arrives days later in batches. Without these two columns you cannot answer "which
		// parcels does this bank transfer cover?"
		codSettledAt: tsCol('cod_settled_at'),
		settlementId: text().references(() => courierSettlement.id, { onDelete: 'set null' }),
		/** Deducted by the courier from the COD they hand back. */
		deliveryFeeMinor: integer('delivery_fee_minor'),
		labelUrl: text('label_url'),
		/** Snapshot of the destination, so routing stats survive an address edit. */
		district: text(),
		thana: text(),
		failureReason: text('failure_reason'),
		pushedAt: tsCol('pushed_at'),
		deliveredAt: tsCol('delivered_at'),
		raw: jsonb().$type<Record<string, unknown>>(),
		/** Same order pushed twice is one parcel, however often a retry fires. */
		idempotencyKey: text('idempotency_key').notNull(),
		...timestamps
	},
	(t) => [
		uniqueIndex('shipment_idem_idx').on(t.courier, t.idempotencyKey),
		uniqueIndex('shipment_consignment_idx').on(t.courier, t.consignmentId),
		index('shipment_order_idx').on(t.orderId),
		index('shipment_status_idx').on(t.status, t.createdAt),
		// The index behind courier routing: outcomes per courier per area.
		index('shipment_routing_idx').on(t.courier, t.district, t.thana, t.status),
		index('shipment_unsettled_idx').on(t.codSettledAt)
	]
);

// A coupon is a rule, not a discount.
export const coupon = pgTable(
	'coupon',
	{
		id: text().primaryKey(),
		/** Stored uppercase; matching is case-insensitive because customers type it. */
		code: text().notNull(),
		type: text({ enum: ['percent', 'fixed', 'free_shipping'] }).notNull(),
		/** Basis points for percent (1000 = 10%), minor units for fixed. */
		value: integer().notNull().default(0),
		minSubtotalMinor: integer('min_subtotal_minor').notNull().default(0),
		/** Caps a percentage discount, so 50% off never gives away a whole order. */
		maxDiscountMinor: integer('max_discount_minor'),
		/** Null means unlimited. */
		usageLimit: integer('usage_limit'),
		usageCount: integer('usage_count').notNull().default(0),
		perCustomerLimit: integer('per_customer_limit').notNull().default(1),
		startsAt: tsCol('starts_at'),
		endsAt: tsCol('ends_at'),
		isActive: boolean('is_active').notNull().default(true),
		description: text(),
		...timestamps
	},
	(t) => [
		uniqueIndex('coupon_code_idx').on(t.code),
		index('coupon_active_idx').on(t.isActive, t.endsAt)
	]
);

/** One row per use. This is what enforces the per-customer limit. */
export const couponRedemption = pgTable(
	'coupon_redemption',
	{
		id: text().primaryKey(),
		couponId: text()
			.notNull()
			.references(() => coupon.id, { onDelete: 'cascade' }),
		orderId: text()
			.notNull()
			.references(() => order.id, { onDelete: 'cascade' }),
		phoneE164: text('phone_e164').notNull(),
		amountMinor: integer('amount_minor').notNull(),
		createdAt: tsCol('created_at').notNull().defaultNow()
	},
	(t) => [
		// One coupon can only be used once per order, however often a retry fires.
		uniqueIndex('redemption_order_idx').on(t.couponId, t.orderId),
		index('redemption_phone_idx').on(t.couponId, t.phoneE164)
	]
);
