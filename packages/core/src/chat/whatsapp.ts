import type { ChatChannel, Inbound, SendResult } from './types.ts';

type WhatsAppPayload = {
	entry?: {
		changes?: {
			value?: {
				contacts?: { wa_id?: string; profile?: { name?: string } }[];
				messages?: {
					id?: string;
					from?: string;
					timestamp?: string;
					type?: string;
					text?: { body?: string };
					image?: { id?: string };
					button?: { text?: string };
					interactive?: { button_reply?: { title?: string }; list_reply?: { title?: string } };
				}[];
			};
		}[];
	}[];
};

export function whatsapp(phoneNumberId: string, accessToken: string): ChatChannel {
	return {
		name: 'whatsapp',

		parse(payload: unknown): Inbound[] {
			const body = payload as WhatsAppPayload;
			const out: Inbound[] = [];

			for (const entry of body.entry ?? []) {
				for (const change of entry.changes ?? []) {
					const value = change.value;
					const nameOf = new Map(
						(value?.contacts ?? []).map((c) => [c.wa_id ?? '', c.profile?.name ?? null])
					);

					for (const message of value?.messages ?? []) {
						if (!message.id || !message.from) continue;

						// Buttons and list replies are text as far as the inbox cares.
						const text =
							message.text?.body ??
							message.button?.text ??
							message.interactive?.button_reply?.title ??
							message.interactive?.list_reply?.title ??
							(message.type ? `[${message.type}]` : '');

						out.push({
							channel: 'whatsapp',
							externalId: message.from,
							displayName: nameOf.get(message.from) ?? null,
							// A WhatsApp id is the number in international form without the plus.
							phoneE164: `+${message.from}`,
							body: text,
							messageId: message.id,
							sentAt: message.timestamp ? new Date(Number(message.timestamp) * 1000) : null
						});
					}
				}
			}
			return out;
		},

		async send(to: string, body: string): Promise<SendResult> {
			try {
				const res = await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
					method: 'POST',
					headers: {
						'content-type': 'application/json',
						authorization: `Bearer ${accessToken}`
					},
					body: JSON.stringify({
						messaging_product: 'whatsapp',
						to: to.replace(/^\+/, ''),
						type: 'text',
						text: { body }
					}),
					signal: AbortSignal.timeout(15_000)
				});

				const json = (await res.json()) as {
					messages?: { id?: string }[];
					error?: { message?: string };
				};
				const id = json.messages?.[0]?.id;
				if (!res.ok || !id) {
					return { ok: false, error: json.error?.message ?? `whatsapp returned ${res.status}` };
				}
				return { ok: true, messageId: id };
			} catch (err) {
				return { ok: false, error: String(err) };
			}
		}
	};
}
