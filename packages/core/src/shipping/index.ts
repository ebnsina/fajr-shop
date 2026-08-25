import {
	db, shipment, courierSettlement, order, address, orderEvent, outbox,
	newId, eq, and, sql, asc, desc, isNull, inArray
} from '@fajr/db';
import { courierFor, type Courier, type TrackedStatus } from './couriers/index.ts';
import { chooseCourier } from './routing.ts';
import { getOrder, markShipped, type Actor } from '../orders/index.ts';
import { audit } from '../audit/index.ts';

export * from './couriers/index.ts';
export * from './routing.ts';

export type PushOutcome =
	| { ok: true; shipmentId: string; courier: string; consignmentId: string; duplicate?: boolean }
	| { ok: false; error: string; retryable: boolean };

// Hand a parcel to a courier.
export async function pushToCourier(
	orderId: string,
	opts: { courier?: string; actor?: Actor; client?: Courier } = {}
): Promise<PushOutcome> {
	const detail = await getOrder(orderId);
	if (!detail) return { ok: false, error: 'order not found', retryable: false };
	if (!detail.address) return { ok: false, error: 'order has no address', retryable: false };

	const existing = await db.read.query.shipment.findFirst({
		where: and(eq(shipment.orderId, orderId), sql`${shipment.status} <> 'cancelled'`)
	});
	if (existing?.consignmentId) {
		return {
			ok: true,
			shipmentId: existing.id,
			courier: existing.courier,
			consignmentId: existing.consignmentId,
			duplicate: true
		};
	}

	// Our own delivery outcomes decide, unless a human picked one.
	const chosen =
		opts.courier ?? (await chooseCourier(detail.address.district, detail.address.thana))?.courier;
	if (!chosen) return { ok: false, error: 'no courier configured', retryable: false };

	const client = opts.client ?? courierFor(chosen);
	const codMinor = detail.totalMinor - detail.paidMinor;

	const line = [detail.address.detail, detail.address.area, detail.address.thana, detail.address.district]
		.filter(Boolean)
		.join(', ');

	const result = await client.push({
		invoice: detail.publicCode,
		recipientName: detail.address.name,
		recipientPhone: detail.address.phoneE164,
		address: line,
		codAmountMinor: codMinor,
		note: detail.note
	});

	if (!result.ok) {
		await db.write.insert(orderEvent).values({
			id: newId('oev'),
			orderId,
			type: 'courier.failed',
			message: `${chosen}: ${result.error}`,
			actorType: opts.actor?.type ?? 'system',
			actorId: opts.actor?.id ?? null
		});
		return { ok: false, error: result.error, retryable: result.retryable };
	}

	const shipmentId = newId('shp');
	await db.write
		.insert(shipment)
		.values({
			id: shipmentId,
			orderId,
			courier: chosen,
			consignmentId: result.consignmentId,
			trackingCode: result.trackingCode ?? null,
			status: 'pushed',
			codAmountMinor: codMinor,
			labelUrl: result.labelUrl ?? null,
			// Snapshotted so routing stats survive a later address edit.
			district: detail.address.district,
			thana: detail.address.thana,
			pushedAt: new Date(),
			raw: result.raw,
			idempotencyKey: orderId
		})
		.onConflictDoNothing({ target: [shipment.courier, shipment.idempotencyKey] });

	await db.write.insert(orderEvent).values({
		id: newId('oev'),
		orderId,
		type: 'courier.pushed',
		message: `${chosen} · ${result.consignmentId}`,
		actorType: opts.actor?.type ?? 'admin',
		actorId: opts.actor?.id ?? null
	});

	// Pushing to the courier is what "shipped" means: stock leaves the building.
	await markShipped(orderId, opts.actor ?? { type: 'system' }, { courier: chosen });

	await audit({
		actorType: opts.actor?.type ?? 'admin',
		actorId: opts.actor?.id,
		action: 'courier.push',
		entity: 'shipment',
		entityId: shipmentId,
		meta: { courier: chosen, consignmentId: result.consignmentId }
	});

	return { ok: true, shipmentId, courier: chosen, consignmentId: result.consignmentId };
}

const ORDER_STATUS: Partial<Record<TrackedStatus, 'shipped' | 'delivered' | 'returned'>> = {
	delivered: 'delivered',
	returned: 'returned',
	lost: 'returned'
};

/** Pull tracking for one parcel and mirror it onto the order. */
export async function refreshTracking(
	shipmentId: string,
	client?: Courier
): Promise<{ ok: boolean; status?: TrackedStatus }> {
	const row = await db.read.query.shipment.findFirst({ where: eq(shipment.id, shipmentId) });
	if (!row?.consignmentId) return { ok: false };

	const result = await (client ?? courierFor(row.courier)).track(row.consignmentId);
	if (!result.ok) return { ok: false };
	if (result.status === row.status) return { ok: true, status: result.status };

	await db.write
		.update(shipment)
		.set({
			status: result.status,
			deliveredAt: result.deliveredAt ?? row.deliveredAt,
			raw: result.raw,
			updatedAt: new Date()
		})
		.where(eq(shipment.id, shipmentId));

	const next = ORDER_STATUS[result.status];
	if (next) {
		await db.write
			.update(order)
			.set({
				status: next,
				// Delivered COD means the rider collected: the money is owed to us
				// by the courier, not by the customer.
				...(next === 'delivered' ? { paymentStatus: 'paid' as const } : {}),
				updatedAt: new Date()
			})
			.where(eq(order.id, row.orderId));

		await db.write.insert(orderEvent).values({
			id: newId('oev'),
			orderId: row.orderId,
			type: `courier.${result.status}`,
			message: `${row.courier} reported ${result.status}`,
			actorType: 'system'
		});

		await db.write
			.insert(outbox)
			.values({
				id: newId('obx'),
				topic: `order.${next}`,
				payload: { orderId: row.orderId },
				idempotencyKey: `${row.orderId}:${next}`
			})
			.onConflictDoNothing({ target: [outbox.topic, outbox.idempotencyKey] });
	}

	return { ok: true, status: result.status };
}

/** Worker job: refresh everything still in flight. */
export async function refreshAllTracking(limit = 100): Promise<number> {
	const rows = await db.read
		.select({ id: shipment.id })
		.from(shipment)
		.where(inArray(shipment.status, ['pushed', 'picked', 'in_transit']))
		.orderBy(asc(shipment.updatedAt))
		.limit(limit);

	let changed = 0;
	for (const row of rows) {
		const result = await refreshTracking(row.id).catch(() => ({ ok: false as const }));
		if (result.ok) changed += 1;
	}
	return changed;
}

// ── COD reconciliation ──────────────────────────────────────────────────────

export type Reconciliation = {
	settlementId: string;
	matched: { shipmentId: string; orderCode: string; codMinor: number }[];
	unmatched: string[];
	expectedMinor: number;
	declaredMinor: number;
	differenceMinor: number;
};

// Match a courier's payout against the parcels it claims to cover. COD money arrives days later
// in one transfer for many parcels.
export async function reconcile(input: {
	courier: string;
	reference: string;
	amountMinor: number;
	feeMinor?: number;
	settledAt?: Date;
	/** Consignment ids from the courier's statement. */
	consignmentIds: string[];
	note?: string | null;
}): Promise<Reconciliation> {
	const settlementId = newId('stl');

	const [settlement] = await db.write
		.insert(courierSettlement)
		.values({
			id: settlementId,
			courier: input.courier,
			reference: input.reference,
			amountMinor: input.amountMinor,
			feeMinor: input.feeMinor ?? 0,
			settledAt: input.settledAt ?? new Date(),
			note: input.note ?? null
		})
		.onConflictDoUpdate({
			target: [courierSettlement.courier, courierSettlement.reference],
			set: { amountMinor: input.amountMinor, feeMinor: input.feeMinor ?? 0, updatedAt: new Date() }
		})
		.returning({ id: courierSettlement.id });

	const id = settlement!.id;

	const rows = input.consignmentIds.length
		? await db.read
				.select({
					id: shipment.id,
					consignmentId: shipment.consignmentId,
					codAmountMinor: shipment.codAmountMinor,
					orderId: shipment.orderId
				})
				.from(shipment)
				.where(
					and(eq(shipment.courier, input.courier), inArray(shipment.consignmentId, input.consignmentIds))
				)
		: [];

	const found = new Set(rows.map((r) => r.consignmentId));
	const unmatched = input.consignmentIds.filter((c) => !found.has(c));

	if (rows.length) {
		await db.write
			.update(shipment)
			.set({ settlementId: id, codSettledAt: input.settledAt ?? new Date(), updatedAt: new Date() })
			.where(inArray(shipment.id, rows.map((r) => r.id)));
	}

	const codes = rows.length
		? await db.read
				.select({ id: order.id, publicCode: order.publicCode })
				.from(order)
				.where(inArray(order.id, rows.map((r) => r.orderId)))
		: [];
	const codeById = new Map(codes.map((c) => [c.id, c.publicCode]));

	const expectedMinor = rows.reduce((sum, r) => sum + r.codAmountMinor, 0);

	await audit({
		actorType: 'admin',
		action: 'courier.reconcile',
		entity: 'courier_settlement',
		entityId: id,
		meta: {
			courier: input.courier,
			expectedMinor,
			declaredMinor: input.amountMinor,
			unmatched: unmatched.length
		}
	});

	return {
		settlementId: id,
		matched: rows.map((r) => ({
			shipmentId: r.id,
			orderCode: codeById.get(r.orderId) ?? '',
			codMinor: r.codAmountMinor
		})),
		unmatched,
		expectedMinor,
		declaredMinor: input.amountMinor,
		// Expected minus what they paid, minus their fee. Positive means short.
		differenceMinor: expectedMinor - input.amountMinor - (input.feeMinor ?? 0)
	};
}

/** Delivered parcels whose COD money has not arrived yet. */
export async function outstandingCod(courier?: string) {
	return db.read
		.select({
			id: shipment.id,
			courier: shipment.courier,
			consignmentId: shipment.consignmentId,
			codAmountMinor: shipment.codAmountMinor,
			deliveredAt: shipment.deliveredAt,
			orderId: shipment.orderId
		})
		.from(shipment)
		.where(
			and(
				eq(shipment.status, 'delivered'),
				isNull(shipment.codSettledAt),
				sql`${shipment.codAmountMinor} > 0`,
				courier ? eq(shipment.courier, courier) : undefined
			)
		)
		.orderBy(asc(shipment.deliveredAt));
}

export const shipmentsFor = (orderId: string) =>
	db.read.select().from(shipment).where(eq(shipment.orderId, orderId)).orderBy(desc(shipment.createdAt));
