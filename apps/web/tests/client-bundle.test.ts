import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

function walk(dir: string): string[] {
	return readdirSync(dir).flatMap((entry) => {
		const path = join(dir, entry);
		if (entry === 'node_modules' || entry === 'paraglide') return [];
		return statSync(path).isDirectory() ? walk(path) : path.endsWith('.svelte') ? [path] : [];
	});
}

// A component that imports a core *value* drags the database driver into the
// client bundle, and the page dies with "Buffer is not defined". Types are fine.
test('no component imports a value from @fajr/core', () => {
	const offenders = walk('src').filter((file) => {
		const source = readFileSync(file, 'utf8');
		return /^\s*import\s+(?!type\b)[^;]*from\s+'@fajr\/core/m.test(source);
	});

	assert.deepEqual(offenders, [], `move these to $lib: ${offenders.join(', ')}`);
});
