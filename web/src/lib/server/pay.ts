import type { Cookies } from '@sveltejs/kit';

/** Holds a guest's order link while they're away paying, so the gateway never sees it. */
export const PAY_COOKIE = 'fs_pay';

export function payToken(cookies: Cookies, number: number) {
	const [n, token] = (cookies.get(PAY_COOKIE) ?? '').split('.', 2);
	return n === String(number) ? token : undefined;
}

/** Starts paying an order online through the first gateway that's on; the gateway's page, or null. */
export async function startPayment(
	locals: App.Locals,
	cookies: Cookies,
	number: number,
	token: string | undefined
) {
	const methods = await locals.api.GET('/v1/payment-methods');
	const provider = methods.data?.items[0]?.code;
	if (!provider) return null;
	const { data } = await locals.api.POST('/v1/orders/{number}/payments', {
		params: { path: { number } },
		body: { provider, token }
	});
	if (!data) return null;
	if (token)
		cookies.set(PAY_COOKIE, `${number}.${token}`, {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			maxAge: 60 * 60 * 24
		});
	return data.url;
}
