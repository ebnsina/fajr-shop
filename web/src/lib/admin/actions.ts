import { deserialize } from '$app/forms';
import { invalidateAll } from '$app/navigation';
import { errorText } from '#lib/copy.js';

/** Runs one of the page's form actions from code (a menu item), then refreshes the page's data.
 *  Throws the server's message, so a confirming dialog can show it and stay open. */
export async function runAction(name: string, fields: Record<string, string>) {
	const body = new FormData();
	for (const [k, v] of Object.entries(fields)) body.set(k, v);
	const res = await fetch(`?/${name}`, {
		method: 'POST',
		body,
		headers: { 'x-sveltekit-action': 'true' }
	});
	const result = deserialize(await res.text());
	if (result.type === 'failure')
		throw new Error(String(result.data?.message ?? errorText('internal')));
	if (result.type === 'error') throw new Error(errorText('internal'));
	await invalidateAll();
}
