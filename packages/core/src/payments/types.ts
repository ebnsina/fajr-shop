// Payments behind the same adapter shape as couriers and SMS.
export type SessionInput = {
	orderId: string;
	publicCode: string;
	amountMinor: number;
	currency: string;
	customerName: string;
	customerPhone: string;
	customerEmail?: string | null;
	address: string;
	city?: string | null;
	/** Where the gateway sends the customer back. */
	successUrl: string;
	failUrl: string;
	cancelUrl: string;
	ipnUrl: string;
};

export type SessionResult =
	| { ok: true; redirectUrl: string; sessionRef: string; raw: Record<string, unknown> }
	| { ok: false; error: string };

// The result of verifying a callback *with the provider*, never of reading the callback body.
export type VerifiedPayment = {
	ok: boolean;
	/** Our order id, echoed back by the gateway. */
	orderId: string | null;
	/** What the provider says was actually paid, in minor units. */
	amountMinor: number;
	currency: string;
	/** The provider's transaction reference, for reconciliation. */
	reference: string | null;
	status: 'succeeded' | 'failed' | 'pending';
	raw: Record<string, unknown>;
};

export interface PaymentProvider {
	readonly name: string;
	createSession(input: SessionInput): Promise<SessionResult>;
	/** Takes the raw callback fields and confirms them against the provider. */
	verify(fields: Record<string, string>): Promise<VerifiedPayment>;
}
