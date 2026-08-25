import { providerFromEnv, settle } from '@fajr/core/payments';
import type { RequestHandler } from './$types';

// The gateway's server-to-server callback.
export const POST: RequestHandler = async ({ request }) => {
	const provider = await providerFromEnv();
	if (!provider) return new Response('ok');

	const form = await request.formData().catch(() => null);
	if (!form) return new Response('ok');

	const fields = Object.fromEntries(
		[...form.entries()].map(([k, v]) => [k, String(v)])
	) as Record<string, string>;

	const verified = await provider.verify(fields);
	const result = await settle(verified);

	console.log(
		JSON.stringify({
			t: new Date().toISOString(),
			ipn: 'sslcommerz',
			tranId: fields.tran_id,
			verified: verified.ok,
			settled: result.ok,
			reason: result.ok ? undefined : result.reason
		})
	);

	return new Response('ok');
};
