import { db, shippingZone, eq, asc } from '@fajr/db';

export type Quote = {
	zoneId: string | null;
	zoneName: string;
	shippingMinor: number;
	/** COD advance the customer must prepay before dispatch. */
	advanceMinor: number;
	freeApplied: boolean;
};

// First zone listing the district wins; a zone with no districts is the catch-all. Sort decides
// which catch-all, so an admin can reorder rather than think about precedence rules.
export async function quote(district: string | null | undefined, subtotalMinor: number): Promise<Quote> {
	const zones = await db.read
		.select()
		.from(shippingZone)
		.where(eq(shippingZone.isActive, true))
		.orderBy(asc(shippingZone.sort));

	const match =
		(district ? zones.find((z) => z.districts.includes(district)) : undefined) ??
		zones.find((z) => z.districts.length === 0);

	if (!match) return { zoneId: null, zoneName: 'Delivery', shippingMinor: 0, advanceMinor: 0, freeApplied: false };

	const free = match.freeOverMinor !== null && subtotalMinor >= match.freeOverMinor;
	return {
		zoneId: match.id,
		zoneName: match.name,
		shippingMinor: free ? 0 : match.chargeMinor,
		// Free delivery still means no advance to collect — there is nothing to prepay.
		advanceMinor: free ? 0 : match.advanceMinor,
		freeApplied: free
	};
}
