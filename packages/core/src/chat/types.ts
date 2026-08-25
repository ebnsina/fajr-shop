// Both chat platforms behind one interface, the same as couriers and payments.
export type Inbound = {
	channel: 'whatsapp' | 'messenger';
	// The channel's id for this person, which is what threads the conversation.
	externalId: string;
	displayName?: string | null;
	// A WhatsApp sender is a phone number; a Messenger sender is not.
	phoneE164?: string | null;
	body: string;
	// The channel's message id. Webhooks are delivered more than once, and this
	// is the only thing that makes replaying one safe.
	messageId: string;
	attachments?: { type: string; url: string }[];
	sentAt?: Date | null;
};

export type SendResult = { ok: true; messageId: string } | { ok: false; error: string };

export interface ChatChannel {
	readonly name: 'whatsapp' | 'messenger';
	/** Normalise a raw webhook body into zero or more inbound messages. */
	parse(payload: unknown): Inbound[];
	send(to: string, body: string): Promise<SendResult>;
}
