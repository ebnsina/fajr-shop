// A dependency-free PNG encoder, so seeding needs no image directory.
// Deterministic: one name always yields the same tile, so re-seeds look identical.
import { deflateSync } from 'node:zlib';

const CRC = Int32Array.from({ length: 256 }, (_, n) => {
	let c = n;
	for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
	return c;
});

function crc32(bytes: Uint8Array) {
	let c = -1;
	for (const b of bytes) c = CRC[(c ^ b) & 0xff]! ^ (c >>> 8);
	return (c ^ -1) >>> 0;
}

function chunk(type: string, data: Uint8Array) {
	const out = new Uint8Array(data.length + 12);
	const view = new DataView(out.buffer);
	view.setUint32(0, data.length);
	out.set([...type].map((ch) => ch.charCodeAt(0)), 4);
	out.set(data, 8);
	view.setUint32(out.length - 4, crc32(out.subarray(4, out.length - 4)));
	return out;
}

// FNV-1a: one stable number per name, which every colour is derived from.
export function hash(name: string) {
	let h = 0x811c9dc5;
	for (let i = 0; i < name.length; i++) {
		h ^= name.charCodeAt(i);
		h = Math.imul(h, 0x01000193) >>> 0;
	}
	return h;
}

const hsl = (h: number, s: number, l: number): [number, number, number] => {
	const a = s * Math.min(l, 1 - l);
	const f = (n: number) => {
		const k = (n + h / 30) % 12;
		return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))));
	};
	return [f(0), f(8), f(4)];
};

// Soft diagonal gradient in a hue picked from the name.
export function tile(name: string, w = 800, h = 800): Uint8Array {
	const seed = hash(name);
	const hue = seed % 360;
	// Low saturation: these sit behind real titles, and saturated squares read as an error state.
	const from = hsl(hue, 0.32, 0.74);
	const to = hsl((hue + 40) % 360, 0.38, 0.52);
	const band = ((seed >>> 9) % 5) + 2;

	const raw = new Uint8Array(h * (w * 3 + 1));
	let p = 0;
	for (let y = 0; y < h; y++) {
		raw[p++] = 0; // filter: none
		for (let x = 0; x < w; x++) {
			const t = (x / w + y / h) / 2;
			// A faint stripe stops the tiles reading as flat colour swatches.
			const stripe = Math.sin((x - y) / (w / band) * Math.PI) * 0.03;
			for (let c = 0; c < 3; c++) {
				const v = from[c]! + (to[c]! - from[c]!) * t + stripe * 255;
				raw[p++] = Math.max(0, Math.min(255, Math.round(v)));
			}
		}
	}

	const ihdr = new Uint8Array(13);
	const view = new DataView(ihdr.buffer);
	view.setUint32(0, w);
	view.setUint32(4, h);
	ihdr[8] = 8; // bit depth
	ihdr[9] = 2; // colour type: truecolour
	return Buffer.concat([
		Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
		chunk('IHDR', ihdr),
		chunk('IDAT', deflateSync(raw, { level: 9 })),
		chunk('IEND', new Uint8Array(0))
	]);
}
