import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { db, integration, sql } from '@fajr/db';
import {
	CATALOG, listIntegrations, saveIntegration, setEnabled, uninstall, configFor
} from './index.ts';
import { COURIER_SLUGS, courierFor } from '../shipping/couriers/index.ts';
import { PAYMENT_SLUGS, providerFor } from '../payments/index.ts';
import { SMS_BUILDERS } from '../notify/sms.ts';

const TOUCHED = sql`id in ('tap', 'pathao', 'aramex', 'tamara')`;

// Cleared before as well as after: a leftover install from manual testing would
// otherwise make the "fresh install is refused" case pass for the wrong reason.
await db.write.execute(sql`delete from integration where ${TOUCHED}`);

after(async () => {
	await db.write.execute(sql`delete from integration where ${TOUCHED}`);
	await db.close();
});

// The failure this prevents: a provider listed on the integrations page that
// nothing can actually build, so "Connect" leads to a dead end.
test('every catalogue entry has an adapter behind it', () => {
	const buildable = new Set([...COURIER_SLUGS, ...PAYMENT_SLUGS, ...Object.keys(SMS_BUILDERS)]);
	const orphans = CATALOG.filter(
		(c) => ['courier', 'payment', 'sms'].includes(c.kind) && c.status === 'available' && !buildable.has(c.slug)
	).map((c) => c.slug);

	assert.deepEqual(orphans, [], `listed but not buildable: ${orphans.join(', ')}`);
});

test('every listing declares the fields its adapter needs', () => {
	for (const listing of CATALOG) {
		assert.ok(listing.fields.length > 0, `${listing.slug} has no fields`);
		assert.ok(listing.name && listing.blurb && listing.does, `${listing.slug} is missing copy`);
		assert.ok(listing.regions.length > 0, `${listing.slug} belongs to no region`);
	}
});

test('a slug is never listed twice', () => {
	const slugs = CATALOG.map((c) => c.slug);
	assert.equal(new Set(slugs).size, slugs.length);
});

test('an incomplete fresh install is refused, and installs nothing', async () => {
	const result = await saveIntegration('tap', { publishableKey: 'pk_test' });
	assert.equal(result.ok, false);
	assert.equal(await configFor('tap'), null, 'a refused save must not install');
});

test('a complete config installs, and secrets never reach the listing', async () => {
	const result = await saveIntegration('tap', {
		secretKey: 'sk_test_secret',
		publishableKey: 'pk_test_123',
		sandbox: 'true'
	});
	assert.equal(result.ok, true);

	const stored = await configFor('tap');
	assert.equal(stored?.secretKey, 'sk_test_secret', 'the server keeps the real value');

	const listed = (await listIntegrations()).find((i) => i.slug === 'tap')!;
	assert.equal(listed.installed, true);
	assert.notEqual(listed.config.secretKey, 'sk_test_secret', 'the browser must never see it');
	assert.equal(listed.config.publishableKey, 'pk_test_123', 'non-secrets stay readable');
});

test('editing one field leaves the stored secret alone', async () => {
	await saveIntegration('tap', { secretKey: '', publishableKey: 'pk_live_999', sandbox: 'false' });

	const stored = await configFor('tap');
	assert.equal(stored?.secretKey, 'sk_test_secret', 'a blank secret means "keep it"');
	assert.equal(stored?.publishableKey, 'pk_live_999');
});

test('pausing keeps the credentials but hides the provider', async () => {
	await setEnabled('tap', false);
	assert.equal(await configFor('tap'), null, 'a paused provider is not handed out');

	const [row] = await db.read.select().from(integration).where(sql`id = 'tap'`);
	assert.equal(row?.config.secretKey, 'sk_test_secret', 'pausing is not uninstalling');

	await setEnabled('tap', true);
	assert.ok(await configFor('tap'));
});

test('an unconnected courier refuses rather than half-working', async () => {
	await uninstall('aramex');
	await assert.rejects(() => courierFor('aramex'), /not connected/);
});

test('a connected courier builds', async () => {
	await saveIntegration('pathao', {
		clientId: 'id', clientSecret: 'secret', username: 'u',
		password: 'p', storeId: '1', sandbox: 'true'
	});
	const courier = await courierFor('pathao');
	assert.equal(courier.name, 'pathao');
});

test('a connected gateway builds, an unconnected one is null', async () => {
	assert.equal(await providerFor('tamara'), null);
	const gateway = await providerFor('tap');
	assert.equal(gateway?.name, 'tap');
});

test('uninstalling removes it entirely', async () => {
	await uninstall('tap');
	assert.equal(await configFor('tap'), null);
	const listed = (await listIntegrations()).find((i) => i.slug === 'tap')!;
	assert.equal(listed.installed, false);
});
