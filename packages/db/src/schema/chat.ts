import { pgTable, text, boolean, jsonb, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { tsCol, timestamps } from './common.ts';
import { adminUser } from './auth.ts';
import { order } from './commerce.ts';

// One thread per person per channel. Messenger and WhatsApp land in the same
// place, because a shop answering the same customer twice is the actual problem.
export const conversation = pgTable(
	'conversation',
	{
		id: text().primaryKey(),
		channel: text({ enum: ['whatsapp', 'messenger', 'web'] }).notNull(),
		// The channel's own id for this person: a WhatsApp number or a page-scoped
		// Messenger id. Paired with the channel, this is what threads messages.
		externalId: text('external_id').notNull(),
		displayName: text('display_name'),
		// Filled in once we can match them to an order, which is what lets the
		// inbox show who is asking before anyone opens the thread.
		phoneE164: text('phone_e164'),
		lastOrderId: text('last_order_id').references(() => order.id, { onDelete: 'set null' }),
		status: text({ enum: ['open', 'snoozed', 'closed'] })
			.notNull()
			.default('open'),
		assignedTo: text('assigned_to').references(() => adminUser.id, { onDelete: 'set null' }),
		// Denormalised for the list: sorting threads by their newest message is
		// otherwise a join and a group-by on every inbox load.
		lastMessageAt: tsCol('last_message_at').notNull().defaultNow(),
		lastMessagePreview: text('last_message_preview'),
		unreadCount: text('unread_count').notNull().default('0'),
		...timestamps
	},
	(t) => [
		uniqueIndex('conversation_channel_external_idx').on(t.channel, t.externalId),
		index('conversation_inbox_idx').on(t.status, t.lastMessageAt)
	]
);

export const chatMessage = pgTable(
	'chat_message',
	{
		id: text().primaryKey(),
		conversationId: text('conversation_id')
			.notNull()
			.references(() => conversation.id, { onDelete: 'cascade' }),
		direction: text({ enum: ['in', 'out'] }).notNull(),
		body: text().notNull(),
		// Set when a staff member sent it; null for inbound and for automated replies.
		sentBy: text('sent_by').references(() => adminUser.id, { onDelete: 'set null' }),
		// True when the copilot drafted it, so we can measure whether it helps.
		wasSuggested: boolean('was_suggested').notNull().default(false),
		// The channel's message id. Unique per channel, so a webhook delivered
		// twice cannot append the same message twice.
		externalId: text('external_id'),
		attachments: jsonb().$type<{ type: string; url: string }[]>().notNull().default([]),
		deliveredAt: tsCol('delivered_at'),
		failedReason: text('failed_reason'),
		...timestamps
	},
	(t) => [
		index('chat_message_thread_idx').on(t.conversationId, t.createdAt),
		uniqueIndex('chat_message_external_idx').on(t.externalId)
	]
);
