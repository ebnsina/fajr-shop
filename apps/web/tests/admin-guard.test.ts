import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

function walk(dir: string): string[] {
	return readdirSync(dir).flatMap((e) => {
		const p = join(dir, e);
		return statSync(p).isDirectory() ? walk(p) : p.endsWith('+page.server.ts') ? [p] : [];
	});
}

// Hiding a nav item is not authorisation. Every admin route that reads or
// writes must say which permission it needs.
test('every admin route guards its load and actions', () => {
	const exempt = ['login', 'logout'];
	const bad: string[] = [];

	for (const file of walk('src/routes/admin')) {
		if (exempt.some((e) => file.includes(`/${e}/`))) continue;
		const src = readFileSync(file, 'utf8');
		if (src.includes('export const load') && !src.includes('requirePermission')) {
			bad.push(`${file} (load)`);
		}
		if (src.includes('export const actions') && !src.includes('guardActions')) {
			bad.push(`${file} (actions)`);
		}
	}

	assert.deepEqual(bad, [], `unguarded: ${bad.join(', ')}`);
});
