import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { deflateSync } from 'node:zlib';
import { db } from '@fajr/db';
import { upload, get, remove, setAlt, MAX_BYTES } from './index.ts';

/** Smallest valid PNG we can build without a fixture file: 2x3, one IDAT. */
function png(width: number, height: number): Uint8Array {
	const crcTable = Array.from({ length: 256 }, (_, n) => {
		let c = n;
		for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
		return c >>> 0;
	});
	const crc = (buf: Buffer) => {
		let c = 0xffffffff;
		for (const b of buf) c = crcTable[(c ^ b) & 0xff]! ^ (c >>> 8);
		return (c ^ 0xffffffff) >>> 0;
	};
	const chunk = (type: string, data: Buffer) => {
		const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
		const len = Buffer.alloc(4);
		len.writeUInt32BE(data.length);
		const sum = Buffer.alloc(4);
		sum.writeUInt32BE(crc(body));
		return Buffer.concat([len, body, sum]);
	};

	const ihdr = Buffer.alloc(13);
	ihdr.writeUInt32BE(width, 0);
	ihdr.writeUInt32BE(height, 4);
	ihdr[8] = 8; // bit depth
	ihdr[9] = 2; // truecolour

	const raw = Buffer.alloc(height * (1 + width * 3)); // filter byte + RGB per row
	return new Uint8Array(
		Buffer.concat([
			Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
			chunk('IHDR', ihdr),
			chunk('IDAT', deflateSync(raw)),
			chunk('IEND', Buffer.alloc(0))
		])
	);
}

after(() => db.close());

test('an upload lands in storage and reads back with its dimensions', async () => {
	const result = await upload({ bytes: png(2, 3), mimeType: 'image/png' });
	assert.ok(result.ok, 'upload should succeed');
	assert.equal(result.item.width, 2);
	assert.equal(result.item.height, 3);
	assert.equal(result.item.mimeType, 'image/png');
	assert.match(result.item.url, /^https?:\/\/.+\/.+\.png$/);

	const fetched = await fetch(result.item.url);
	assert.equal(fetched.status, 200, 'object should be publicly readable');
	assert.equal((await fetched.arrayBuffer()).byteLength, result.item.sizeBytes);

	await remove(result.item.id);
});

test('alt text round-trips', async () => {
	const result = await upload({ bytes: png(1, 1), mimeType: 'image/png' });
	assert.ok(result.ok);
	await setAlt(result.item.id, 'লাল শাড়ি');
	assert.equal((await get(result.item.id))?.alt, 'লাল শাড়ি');
	await remove(result.item.id);
});

test('the declared content type is ignored in favour of the real bytes', async () => {
	// Claims to be a webp; the header says PNG. The header wins.
	const result = await upload({ bytes: png(4, 4), mimeType: 'image/webp' });
	assert.ok(result.ok);
	assert.equal(result.item.mimeType, 'image/png');
	await remove(result.item.id);
});

test('a non-image is rejected', async () => {
	const result = await upload({ bytes: new TextEncoder().encode('<?php system($_GET[0]); ?>'), mimeType: 'image/png' });
	assert.equal(result.ok, false);
	assert.equal(result.ok === false && result.reason, 'corrupt');
});

test('an oversized file is rejected before it reaches storage', async () => {
	const result = await upload({ bytes: new Uint8Array(MAX_BYTES + 1), mimeType: 'image/png' });
	assert.equal(result.ok, false);
	assert.equal(result.ok === false && result.reason, 'too_large');
});

test('delete removes both the row and the object', async () => {
	const result = await upload({ bytes: png(2, 2), mimeType: 'image/png' });
	assert.ok(result.ok);
	const { id, url } = result.item;

	await remove(id);
	assert.equal(await get(id), null, 'row should be gone');
	assert.notEqual((await fetch(url)).status, 200, 'object should be gone');
});
