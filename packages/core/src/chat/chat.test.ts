import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { db, conversation, chatMessage, sql } from '@fajr/db';
import { whatsapp, messenger } from './index.ts';
import { ingest, inbox, thread, markRead, setStatus, unreadTotal } from './index.ts';
import { intentOf, suggest } from './copilot.ts';

const WA = '8801700000501';

after(async () => {
	await db.write.execute(
		sql`delete from conversation where external_id in (${WA}, 'psid_test_1', 'psid_test_2')`
	);
	await db.close();
});

await db.write.execute(
	sql`delete from conversation where external_id in (${WA}, 'psid_test_1', 'psid_test_2')`
);

// ── parsing ─────────────────────────────────────────────────────────────────

const wa = whatsapp('pnid', 'token');

test('a WhatsApp text message parses into one inbound', () => {
	const parsed = wa.parse({
		entry: [
			{
				changes: [
					{
						value: {
							contacts: [{ wa_id: WA, profile: { name: 'Rina' } }],
							messages: [
								{ id: 'wamid.1', from: WA, timestamp: '1700000000', type: 'text', text: { body: 'Where is my order?' } }
							]
						}
					}
				]
			}
		]
	});

	assert.equal(parsed.length, 1);
	assert.equal(parsed[0]!.displayName, 'Rina');
	// A WhatsApp id is the number without the plus; the inbox wants E.164.
	assert.equal(parsed[0]!.phoneE164, `+${WA}`);
	assert.equal(parsed[0]!.body, 'Where is my order?');
});

test('a button tap parses as its label, not as empty', () => {
	const parsed = wa.parse({
		entry: [{ changes: [{ value: { messages: [
			{ id: 'wamid.2', from: WA, type: 'interactive', interactive: { button_reply: { title: 'Track my order' } } }
		] } }] }]
	});
	assert.equal(parsed[0]!.body, 'Track my order');
});

const fb = messenger('page_1', 'token');

test('Messenger echoes are ignored, or the shop talks to itself', () => {
	const parsed = fb.parse({
		entry: [{ messaging: [
			{ sender: { id: 'psid_test_1' }, message: { mid: 'm.1', text: 'Hello' } },
			{ sender: { id: 'page_1' }, message: { mid: 'm.2', text: 'Our own reply', is_echo: true } }
		] }]
	});
	assert.equal(parsed.length, 1);
	assert.equal(parsed[0]!.body, 'Hello');
	assert.equal(parsed[0]!.phoneE164, null, 'a page-scoped id is not a phone number');
});

// ── threading ───────────────────────────────────────────────────────────────

test('two messages from one person land in one thread', async () => {
	const first = await ingest({
		channel: 'whatsapp', externalId: WA, displayName: 'Rina',
		phoneE164: `+${WA}`, body: 'Where is my order?', messageId: 'wamid.t1'
	});
	const second = await ingest({
		channel: 'whatsapp', externalId: WA, displayName: 'Rina',
		phoneE164: `+${WA}`, body: 'Hello?', messageId: 'wamid.t2'
	});

	assert.equal(first.conversationId, second.conversationId);
	assert.equal(second.duplicate, false);
});

// Meta redelivers webhooks. Without this the customer appears to ask twice.
test('the same webhook delivered twice appends once', async () => {
	const again = await ingest({
		channel: 'whatsapp', externalId: WA,
		phoneE164: `+${WA}`, body: 'Hello?', messageId: 'wamid.t2'
	});
	assert.equal(again.duplicate, true);

	const [row] = await db.read
		.select({ n: sql<number>`count(*)::int` })
		.from(chatMessage)
		.where(sql`conversation_id = ${again.conversationId}`);
	assert.equal(row?.n, 2, 'two distinct messages, not three');
});

test('the same person on two channels is two threads', async () => {
	const a = await ingest({ channel: 'messenger', externalId: 'psid_test_2', body: 'Hi', messageId: 'm.t1' });
	const [wa] = await db.read
		.select({ id: conversation.id })
		.from(conversation)
		.where(sql`external_id = ${WA}`);

	assert.notEqual(a.conversationId, wa?.id, 'a Messenger id and a number are different people to us');
});

test('unread counts up on arrival and clears when opened', async () => {
	const before = await unreadTotal();
	assert.ok(before > 0, 'inbound messages are unread until someone looks');

	const open = await inbox('open');
	const mine = open.find((t) => t.phoneE164 === `+${WA}`)!;
	assert.ok(mine.unreadCount > 0);

	await markRead(mine.id);
	const after = await inbox('open');
	assert.equal(after.find((t) => t.id === mine.id)!.unreadCount, 0);
});

test('the list shows the newest message and closing hides the thread', async () => {
	const open = await inbox('open');
	const mine = open.find((t) => t.phoneE164 === `+${WA}`)!;
	assert.equal(mine.lastMessagePreview, 'Hello?');

	await setStatus(mine.id, 'closed');
	assert.equal((await inbox('open')).some((t) => t.id === mine.id), false);
	assert.equal((await inbox('closed')).some((t) => t.id === mine.id), true);

	// Writing again reopens it, or a closed thread swallows the reply.
	await ingest({
		channel: 'whatsapp', externalId: WA,
		phoneE164: `+${WA}`, body: 'Still waiting', messageId: 'wamid.t3'
	});
	assert.equal((await inbox('open')).some((t) => t.id === mine.id), true);
});

test('a thread reads oldest first', async () => {
	const open = await inbox('open');
	const mine = open.find((t) => t.phoneE164 === `+${WA}`)!;
	const full = (await thread(mine.id))!;

	assert.equal(full.messages.length, 3);
	assert.equal(full.messages[0]!.body, 'Where is my order?');
	assert.equal(full.messages.at(-1)!.body, 'Still waiting');
});

// ── copilot ─────────────────────────────────────────────────────────────────

test('intent is read from the words, in English or Bangla', () => {
	assert.equal(intentOf('where is my order'), 'order_status');
	assert.equal(intentOf('koto taka?'), 'price');
	// Bengali has no ASCII word boundary, which once made every Bangla message
	// read as unknown.
	assert.equal(intentOf('ডেলিভারি কবে'), 'delivery');
	assert.equal(intentOf('দাম কত'), 'price');
	assert.equal(intentOf('bkash e pay korbo'), 'payment');
	assert.equal(intentOf('can I return this'), 'returns');
	// "size" would match stock; the exchange is what they are actually asking.
	assert.equal(intentOf('can I exchange this for another size'), 'returns');
	assert.equal(intentOf('asdfgh'), 'unknown');
});

test('a suggestion always comes back, with a reason attached', async () => {
	const suggestions = await suggest({
		text: 'asdfgh',
		phoneE164: null,
		storeName: 'Test Shop',
		deliversTo: 'across Bangladesh'
	});

	assert.ok(suggestions.length > 0, 'never leave staff with a blank box');
	assert.ok(suggestions[0]!.because, 'staff must be able to judge why it was offered');
	assert.match(suggestions[0]!.body, /Test Shop/);
});

test('a returns question is answered with the returns policy', async () => {
	const suggestions = await suggest({
		text: 'can I exchange this for another size',
		phoneE164: null,
		storeName: 'Test Shop',
		deliversTo: 'across Bangladesh'
	});
	assert.match(suggestions[0]!.body, /exchange within 7 days/i);
});
