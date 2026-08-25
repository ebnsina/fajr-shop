// Every courier behind one interface. Steadfast has the simplest API and ships first; Pathao
// and RedX are added files, not a refactor of anything.
export type Parcel = {
	/** Our public order code — what the customer and the courier both quote. */
	invoice: string;
	recipientName: string;
	recipientPhone: string;
	/** One line. BD couriers do not parse structured addresses. */
	address: string;
	/** Zero for a prepaid order: the rider collects nothing. */
	codAmountMinor: number;
	note?: string | null;
	weightGrams?: number | null;
};

export type PushResult =
	| { ok: true; consignmentId: string; trackingCode?: string | null; labelUrl?: string | null; raw: Record<string, unknown> }
	| { ok: false; error: string; retryable: boolean };

export type TrackedStatus =
	| 'pushed' | 'picked' | 'in_transit' | 'delivered' | 'returned' | 'lost' | 'cancelled';

export type TrackResult =
	| { ok: true; status: TrackedStatus; deliveredAt?: Date | null; raw: Record<string, unknown> }
	| { ok: false; error: string };

export interface Courier {
	readonly name: string;
	push(parcel: Parcel): Promise<PushResult>;
	track(consignmentId: string): Promise<TrackResult>;
}
