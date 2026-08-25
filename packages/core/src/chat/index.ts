import {
	db, conversation, chatMessage, order, adminUser,
	newId, eq, and, desc, sql, inArray
} from '@fajr/db';
import { configFor, enabledOf } from '../integrations/index.ts';
import { audit } from '../audit/index.ts';
import { whatsapp } from './whatsapp.ts';
import { messenger } from './messenger.ts';
import type { ChatChannel, Inbound } from './types.ts';

export * from './types.ts';
export * from './copilot.ts';
export { whatsapp, messenger };

const BUILDERS: Record<string, (c: Record<string, string>) => ChatChannel> = {
	whatsapp: (c) => whatsapp(c.phoneNumberId ?? '', c.accessToken ?? ''),
	messenger: (c) => messenger(c.pageId ?? '', c.pageAccessToken ?? '')
};

export const CHAT_SLUGS = Object.keys(BUILDERS);

export async function channelFor(slug: string): Promise<ChatChannel | null> {
	const build = BUILDERS[slug];
	if (!build) return null;
	const config = await configFor(slug);
	return config ? build(config) : null;
}

export const enabledChannels = async () =>
	(await enabledOf('chat')).map((i) => i.slug).filter((s) => s in BUILDERS);

// Meta sends the verify token on subscribe; only the shop's own token passes.
export async function verifyWebhook(
	slug: string,
	mode: string | null,
	token: string | null
): Promise<boolean> {
	const config = await configFor(slug);
	return Boolean(config?.verifyToken) && mode === 'subscribe' && token === config!.verifyToken;
}

// ── ingest ──────────────────────────────────────────────────────────────────

const preview = (text: string) => text.replace(/\s+/g, ' ').trim().slice(0, 120);

/**
 * Threads an inbound message. Idempotent on the channel's message id, because
 * Meta redelivers webhooks and a duplicate would show the customer asking twice.
 */
export async function ingest(message: Inbound): Promise<{ conversationId: string; duplicate: boolean }> {
	const existing = await db.read.query.conversation.findFirst({
		where: and(
			eq(conversation.channel, message.channel),
			eq(conversation.externalId, message.externalId)
		)
	});

	let conversationId = existing?.id;

	if (!conversationId) {
		conversationId = newId('cnv');
		// Match them to a customer straight away where the channel gives us a
		// number, so the inbox can show who is asking before anyone opens it.
		const matched = message.phoneE164
			? await db.read.query.order.findFirst({
					where: eq(order.phoneE164, message.phoneE164),
					orderBy: desc(order.placedAt)
				})
			: null;

		await db.write.insert(conversation).values({
			id: conversationId,
			channel: message.channel,
			externalId: message.externalId,
			displayName: message.displayName ?? null,
			phoneE164: message.phoneE164 ?? null,
			lastOrderId: matched?.id ?? null
		});
	}

	const inserted = await db.write
		.insert(chatMessage)
		.values({
			id: newId('cms'),
			conversationId,
			direction: 'in',
			body: message.body,
			externalId: message.messageId,
			attachments: message.attachments ?? [],
			createdAt: message.sentAt ?? undefined
		})
		.onConflictDoNothing({ target: chatMessage.externalId })
		.returning({ id: chatMessage.id });

	if (!inserted.length) return { conversationId, duplicate: true };

	await db.write
		.update(conversation)
		.set({
			lastMessageAt: message.sentAt ?? sql`now()`,
			lastMessagePreview: preview(message.body),
			unreadCount: sql`(${conversation.unreadCount}::int + 1)::text`,
			// A closed thread reopens when they write again.
			status: 'open',
			displayName: message.displayName ?? existing?.displayName ?? null,
			updatedAt: sql`now()`
		})
		.where(eq(conversation.id, conversationId));

	return { conversationId, duplicate: false };
}

// ── replying ────────────────────────────────────────────────────────────────

export async function reply(
	conversationId: string,
	body: string,
	ctx: { actorId?: string | null; wasSuggested?: boolean } = {}
): Promise<{ ok: boolean; error?: string }> {
	const thread = await db.read.query.conversation.findFirst({
		where: eq(conversation.id, conversationId)
	});
	if (!thread) return { ok: false, error: 'That conversation no longer exists.' };

	const channel = await channelFor(thread.channel);
	if (!channel) {
		return { ok: false, error: `${thread.channel} is not connected. Connect it under Integrations.` };
	}

	const sent = await channel.send(thread.externalId, body);

	// Recorded either way: a failed reply the staff member cannot see is a
	// customer who thinks they were ignored.
	await db.write.insert(chatMessage).values({
		id: newId('cms'),
		conversationId,
		direction: 'out',
		body,
		sentBy: ctx.actorId ?? null,
		wasSuggested: ctx.wasSuggested ?? false,
		externalId: sent.ok ? sent.messageId : null,
		deliveredAt: sent.ok ? new Date() : null,
		failedReason: sent.ok ? null : sent.error
	});

	await db.write
		.update(conversation)
		.set({
			lastMessageAt: sql`now()`,
			lastMessagePreview: preview(body),
			unreadCount: '0',
			updatedAt: sql`now()`
		})
		.where(eq(conversation.id, conversationId));

	if (!sent.ok) return { ok: false, error: sent.error };

	await audit({
		actorType: 'admin',
		actorId: ctx.actorId ?? null,
		action: 'chat.reply',
		entity: 'conversation',
		entityId: conversationId
	});
	return { ok: true };
}

// ── inbox ───────────────────────────────────────────────────────────────────

export async function inbox(status: 'open' | 'snoozed' | 'closed' = 'open', limit = 50) {
	const rows = await db.read
		.select({
			id: conversation.id,
			channel: conversation.channel,
			displayName: conversation.displayName,
			phoneE164: conversation.phoneE164,
			status: conversation.status,
			lastMessageAt: conversation.lastMessageAt,
			lastMessagePreview: conversation.lastMessagePreview,
			unreadCount: conversation.unreadCount,
			assignedTo: conversation.assignedTo,
			orderCode: order.publicCode,
			orderStatus: order.status
		})
		.from(conversation)
		.leftJoin(order, eq(order.id, conversation.lastOrderId))
		.where(eq(conversation.status, status))
		.orderBy(desc(conversation.lastMessageAt))
		.limit(limit);

	return rows.map((r) => ({ ...r, unreadCount: Number(r.unreadCount) }));
}

export async function thread(conversationId: string) {
	const head = await db.read
		.select({
			id: conversation.id,
			channel: conversation.channel,
			externalId: conversation.externalId,
			displayName: conversation.displayName,
			phoneE164: conversation.phoneE164,
			status: conversation.status,
			assignedTo: conversation.assignedTo,
			orderId: conversation.lastOrderId,
			orderCode: order.publicCode,
			orderStatus: order.status,
			orderTotalMinor: order.totalMinor,
			orderCurrency: order.currency
		})
		.from(conversation)
		.leftJoin(order, eq(order.id, conversation.lastOrderId))
		.where(eq(conversation.id, conversationId))
		.limit(1);

	if (!head.length) return null;

	const messages = await db.read
		.select({
			id: chatMessage.id,
			direction: chatMessage.direction,
			body: chatMessage.body,
			wasSuggested: chatMessage.wasSuggested,
			failedReason: chatMessage.failedReason,
			attachments: chatMessage.attachments,
			sentBy: adminUser.name,
			createdAt: chatMessage.createdAt
		})
		.from(chatMessage)
		.leftJoin(adminUser, eq(adminUser.id, chatMessage.sentBy))
		.where(eq(chatMessage.conversationId, conversationId))
		.orderBy(chatMessage.createdAt);

	return { ...head[0]!, messages };
}

export async function markRead(conversationId: string) {
	await db.write
		.update(conversation)
		.set({ unreadCount: '0', updatedAt: sql`now()` })
		.where(eq(conversation.id, conversationId));
}

export async function setStatus(
	conversationId: string,
	status: 'open' | 'snoozed' | 'closed',
	ctx: { actorId?: string | null } = {}
) {
	await db.write
		.update(conversation)
		.set({ status, assignedTo: ctx.actorId ?? null, updatedAt: sql`now()` })
		.where(eq(conversation.id, conversationId));
}

export async function unreadTotal(): Promise<number> {
	const [row] = await db.read
		.select({ n: sql<number>`coalesce(sum(${conversation.unreadCount}::int), 0)::int` })
		.from(conversation)
		.where(eq(conversation.status, 'open'));
	return row?.n ?? 0;
}
