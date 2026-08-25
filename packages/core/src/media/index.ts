import { imageSize } from 'image-size';
import { db, media, newId, eq, desc, sql } from '@fajr/db';
import { putObject, deleteObject, publicUrl, publicOrigin } from './storage.ts';
import { audit } from '../audit/index.ts';

export { publicUrl, publicOrigin };

export const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif']);

export type MediaItem = {
	id: string;
	key: string;
	url: string;
	mimeType: string;
	sizeBytes: number;
	width: number | null;
	height: number | null;
	alt: string | null;
	createdAt: Date;
};

export type UploadResult =
	| { ok: true; item: MediaItem }
	| { ok: false; reason: 'too_large' | 'unsupported_type' | 'corrupt' };

const toItem = (row: typeof media.$inferSelect): MediaItem => ({
	id: row.id,
	key: row.key,
	url: publicUrl(row.key),
	mimeType: row.mimeType,
	sizeBytes: row.sizeBytes,
	width: row.width,
	height: row.height,
	alt: row.alt,
	createdAt: row.createdAt
});

// Bytes go to object storage, metadata to Postgres, nothing to local disk — that's what keeps
// any request servable by any process.
export async function upload(
	file: { bytes: Uint8Array; mimeType: string; alt?: string | null },
	ctx: { uploadedBy?: string | null; requestId?: string | null } = {}
): Promise<UploadResult> {
	if (file.bytes.byteLength > MAX_BYTES) return { ok: false, reason: 'too_large' };

	// Trust the bytes, not the client's Content-Type — image-size reads the
	// actual header, so a .php renamed to .jpg fails here.
	let dims: { width?: number; height?: number; type?: string };
	try {
		dims = imageSize(file.bytes);
	} catch {
		return { ok: false, reason: 'corrupt' };
	}

	const detected = dims.type === 'jpg' ? 'image/jpeg' : `image/${dims.type}`;
	if (!ALLOWED.has(detected)) return { ok: false, reason: 'unsupported_type' };

	const id = newId('med');
	const ext = detected.split('/')[1]!.replace('jpeg', 'jpg');
	const key = `${new Date().toISOString().slice(0, 7)}/${id}.${ext}`;

	await putObject(key, file.bytes, detected);

	const [row] = await db.write
		.insert(media)
		.values({
			id,
			key,
			mimeType: detected,
			sizeBytes: file.bytes.byteLength,
			width: dims.width ?? null,
			height: dims.height ?? null,
			alt: file.alt ?? null,
			uploadedBy: ctx.uploadedBy ?? null
		})
		.returning();

	await audit({
		actorType: 'admin',
		actorId: ctx.uploadedBy,
		action: 'media.upload',
		entity: 'media',
		entityId: id,
		meta: { key, sizeBytes: file.bytes.byteLength },
		requestId: ctx.requestId
	});

	return { ok: true, item: toItem(row!) };
}

export async function list(opts: { limit?: number; before?: Date } = {}): Promise<MediaItem[]> {
	const limit = Math.min(opts.limit ?? 60, 200);
	const rows = await db.read
		.select()
		.from(media)
		.where(opts.before ? sql`${media.createdAt} < ${opts.before}` : undefined)
		.orderBy(desc(media.createdAt))
		.limit(limit);
	return rows.map(toItem);
}

export async function get(id: string): Promise<MediaItem | null> {
	const row = await db.read.query.media.findFirst({ where: eq(media.id, id) });
	return row ? toItem(row) : null;
}

export async function setAlt(id: string, alt: string | null): Promise<void> {
	await db.write.update(media).set({ alt, updatedAt: new Date() }).where(eq(media.id, id));
}

// Row first, then the object. If the delete of the object fails the row is already gone, which
// leaves an orphan blob — cheap.
export async function remove(id: string, ctx: { actorId?: string | null } = {}): Promise<void> {
	const row = await db.read.query.media.findFirst({ where: eq(media.id, id) });
	if (!row) return;
	await db.write.delete(media).where(eq(media.id, id));
	try {
		await deleteObject(row.key);
	} catch (err) {
		console.error(JSON.stringify({ t: new Date().toISOString(), orphanedObject: row.key, err: String(err) }));
	}
	await audit({ actorType: 'admin', actorId: ctx.actorId, action: 'media.delete', entity: 'media', entityId: id });
}
