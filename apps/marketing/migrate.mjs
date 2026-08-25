// Applies migrations/*.sql in order. One table; drizzle-kit would be ceremony.
import { readdirSync, readFileSync } from 'node:fs';
import postgres from 'postgres';

const url = process.env.LEADS_DATABASE_URL;
if (!url) throw new Error('LEADS_DATABASE_URL is not set');

const sql = postgres(url, { max: 1 });
for (const file of readdirSync('migrations').filter((f) => f.endsWith('.sql')).sort()) {
	await sql.unsafe(readFileSync(`migrations/${file}`, 'utf8'));
	console.log(`applied ${file}`);
}
await sql.end();
