import { db, cart, eq, and, sql } from '@fajr/db';

export type AbandonedCart = {
	cartId: string;
	phoneE164: string;
	itemCount: number;
	subtotalMinor: number;
	updatedAt: Date;
};

/** Long enough that they have genuinely stopped, short enough to still care. */
export const IDLE_HOURS = 4;
/** After this it is not a reminder, it is a cold ad. */
export const MAX_AGE_HOURS = 72;

// Carts worth chasing: something in them, a phone to reach, no order placed, idle for a while,
// and never chased before.
export async function findAbandoned(limit = 50): Promise<AbandonedCart[]> {
	const rows = (await db.read.execute(sql`
		select c.id                                   as cart_id,
		       c.phone_e164                           as phone,
		       c.updated_at                           as updated_at,
		       sum(ci.qty)                            as item_count,
		       sum(ci.qty * v.price_minor)            as subtotal
		from cart c
		join cart_item ci on ci.cart_id = c.id
		join variant v on v.id = ci.variant_id
		where c.status = 'open'
		  and c.phone_e164 is not null
		  and c.recovered_at is null
		  and c.updated_at < now() - make_interval(hours => ${IDLE_HOURS})
		  and c.updated_at > now() - make_interval(hours => ${MAX_AGE_HOURS})
		  -- Somebody who ordered anyway does not need chasing.
		  and not exists (
		    select 1 from "order" o
		    where o.phone_e164 = c.phone_e164
		      and o.placed_at > c.updated_at
		  )
		group by c.id, c.phone_e164, c.updated_at
		order by c.updated_at
		limit ${limit}
	`)) as unknown as {
		cart_id: string;
		phone: string;
		updated_at: Date;
		item_count: number | string;
		subtotal: number | string;
	}[];

	return rows.map((r) => ({
		cartId: r.cart_id,
		phoneE164: r.phone,
		itemCount: Number(r.item_count),
		subtotalMinor: Number(r.subtotal),
		updatedAt: r.updated_at
	}));
}

/** Stamped before the message is sent, so a crash cannot cause a second one. */
export const markRecovered = (cartId: string) =>
	db.write.update(cart).set({ recoveredAt: new Date() }).where(eq(cart.id, cartId));

/** Captured on blur at checkout, before the form is submitted. */
export async function attachPhone(cartId: string, phoneE164: string): Promise<void> {
	await db.write
		.update(cart)
		.set({ phoneE164 })
		.where(and(eq(cart.id, cartId), eq(cart.status, 'open')));
}
