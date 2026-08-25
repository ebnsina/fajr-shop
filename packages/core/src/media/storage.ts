import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

// Connected on first use, not on import.
let client: S3Client | undefined;

function config() {
	const endpoint = process.env.STORAGE_ENDPOINT;
	const bucket = process.env.STORAGE_BUCKET;
	if (!endpoint || !bucket) throw new Error('STORAGE_ENDPOINT and STORAGE_BUCKET are required');
	return { endpoint, bucket };
}

function s3(): S3Client {
	if (client) return client;
	const { endpoint } = config();
	client = new S3Client({
		region: 'auto',
		endpoint,
		forcePathStyle: true, // MinIO needs it; R2 accepts it
		credentials: {
			accessKeyId: process.env.STORAGE_ACCESS_KEY_ID!,
			secretAccessKey: process.env.STORAGE_SECRET_ACCESS_KEY!
		}
	});
	return client;
}

export async function putObject(key: string, body: Uint8Array, contentType: string): Promise<void> {
	await s3().send(
		new PutObjectCommand({
			Bucket: config().bucket,
			Key: key,
			Body: body,
			ContentType: contentType,
			// Objects are immutable: the key contains a random id, so a changed
			// image is a new key. Cache it forever at the edge.
			CacheControl: 'public, max-age=31536000, immutable'
		})
	);
}

export async function deleteObject(key: string): Promise<void> {
	await s3().send(new DeleteObjectCommand({ Bucket: config().bucket, Key: key }));
}

// The CDN in front of the bucket, which is also what does the resizing.
export const publicUrl = (key: string) => `${publicBase()}/${key}`;

const publicBase = () =>
	(
		process.env.STORAGE_PUBLIC_URL ??
		`${process.env.STORAGE_ENDPOINT ?? ''}/${process.env.STORAGE_BUCKET ?? ''}`
	).replace(/\/$/, '');

// The origin serving media, for CSP img-src. In dev that is a plain-http MinIO,
// which no blanket https: source covers.
export function publicOrigin(): string | null {
	try {
		return new URL(publicBase()).origin;
	} catch {
		return null;
	}
}
