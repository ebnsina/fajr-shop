import type { ChatChannel, Inbound, SendResult } from './types.ts';

type MessengerPayload = {
	entry?: {
		messaging?: {
			sender?: { id?: string };
			timestamp?: number;
			message?: {
				mid?: string;
				text?: string;
				attachments?: { type?: string; payload?: { url?: string } }[];
				is_echo?: boolean;
			};
			postback?: { mid?: string; title?: string };
		}[];
	}[];
};

export function messenger(pageId: string, pageAccessToken: string): ChatChannel {
	return {
		name: 'messenger',

		parse(payload: unknown): Inbound[] {
			const body = payload as MessengerPayload;
			const out: Inbound[] = [];

			for (const entry of body.entry ?? []) {
				for (const event of entry.messaging ?? []) {
					const senderId = event.sender?.id;
					if (!senderId || senderId === pageId) continue;

					// Echoes are our own outbound messages coming back. Threading them
					// as inbound would show the shop talking to itself.
					if (event.message?.is_echo) continue;

					const id = event.message?.mid ?? event.postback?.mid;
					if (!id) continue;

					const attachments = (event.message?.attachments ?? [])
						.filter((a) => a.payload?.url)
						.map((a) => ({ type: a.type ?? 'file', url: a.payload!.url! }));

					const text =
						event.message?.text ??
						event.postback?.title ??
						(attachments.length ? `[${attachments[0]!.type}]` : '');
					if (!text) continue;

					out.push({
						channel: 'messenger',
						externalId: senderId,
						// A page-scoped id is not a phone number, so there is nothing to
						// match on until they tell us in the thread.
						phoneE164: null,
						body: text,
						messageId: id,
						attachments,
						sentAt: event.timestamp ? new Date(event.timestamp) : null
					});
				}
			}
			return out;
		},

		async send(to: string, body: string): Promise<SendResult> {
			try {
				const res = await fetch(
					`https://graph.facebook.com/v21.0/me/messages?access_token=${encodeURIComponent(pageAccessToken)}`,
					{
						method: 'POST',
						headers: { 'content-type': 'application/json' },
						body: JSON.stringify({
							recipient: { id: to },
							messaging_type: 'RESPONSE',
							message: { text: body }
						}),
						signal: AbortSignal.timeout(15_000)
					}
				);

				const json = (await res.json()) as { message_id?: string; error?: { message?: string } };
				if (!res.ok || !json.message_id) {
					return { ok: false, error: json.error?.message ?? `messenger returned ${res.status}` };
				}
				return { ok: true, messageId: json.message_id };
			} catch (err) {
				return { ok: false, error: String(err) };
			}
		}
	};
}
