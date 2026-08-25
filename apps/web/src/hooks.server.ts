import { randomUUID } from 'node:crypto';
import { redirect, type Handle } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import { dev } from '$app/environment';
import { paraglideMiddleware } from '$lib/paraglide/server';
import { getTextDirection } from '$lib/paraglide/runtime';
import { verifySession } from '@fajr/core/auth';
import { getStaff } from '@fajr/core/staff';
import { getSettings } from '@fajr/core/settings';
import { SESSION_COOKIE } from '$lib/server/session';

// One indexed lookup per request onto event.locals; SSR calls core directly.
// Locale resolves server-side, or the page visibly flips after hydration.
const withLocale: Handle = ({ event, resolve }) =>
	paraglideMiddleware(event.request, ({ request, locale }) => {
		event.request = request;
		return resolve(event, {
			transformPageChunk: ({ html }) =>
				html.replace('%lang%', locale).replace('%dir%', getTextDirection(locale))
		});
	});

const app: Handle = async ({ event, resolve }) => {
	event.locals.requestId = event.request.headers.get('x-request-id') ?? randomUUID();

	const session = await verifySession(event.cookies.get(SESSION_COOKIE));
	event.locals.staff =
		session?.userType === 'admin' ? await getStaff(session.userId) : null;

	const { pathname } = event.url;
	if (pathname.startsWith('/admin') && pathname !== '/admin/login' && !event.locals.staff) {
		const next = pathname + event.url.search;
		redirect(303, `/admin/login?next=${encodeURIComponent(next)}`);
	}

	// A shop that has never been configured opens on the wizard. The importer is excluded because
	// the wizard sends people there mid-flow, and logout so nobody can get stuck.
	if (
		event.locals.staff &&
		pathname.startsWith('/admin') &&
		!pathname.startsWith('/admin/setup') &&
		!pathname.startsWith('/admin/logout') &&
		!pathname.startsWith('/admin/products/import')
	) {
		const settings = await getSettings();
		if (settings.setupStep) redirect(303, '/admin/setup');
	}

	const response = await resolve(event);
	response.headers.set('x-request-id', event.locals.requestId);
	applyCaching(event, response);
	applySecurityHeaders(event, response);
	return response;
};

// Security headers, set at the origin rather than only at the proxy — a shop that later moves
// behind a different CDN should not silently lose them.
function applySecurityHeaders(event: Parameters<Handle>[0]['event'], response: Response): void {
	const headers = response.headers;

	// Clickjacking: nothing here should ever be framed.
	headers.set('x-frame-options', 'DENY');
	headers.set('x-content-type-options', 'nosniff');
	headers.set('referrer-policy', 'strict-origin-when-cross-origin');
	// No page needs a camera, a microphone or the user's location.
	headers.set('permissions-policy', 'camera=(), microphone=(), geolocation=(), interest-cohort=()');
	headers.set('cross-origin-opener-policy', 'same-origin');

	// HSTS only over TLS, and only in production: sending it from a dev server
	// pins localhost to https in the browser for a year.
	if (!dev && event.url.protocol === 'https:') {
		headers.set('strict-transport-security', 'max-age=31536000; includeSubDomains');
	}
}

const isHtml = (response: Response) =>
	response.headers.get('content-type')?.includes('text/html') ?? false;

export const handle: Handle = sequence(withLocale, app);

/** Pages that are the same for every anonymous visitor. Everything else is private. */
const CACHEABLE = [/^\/$/, /^\/c\//, /^\/products\//];

// One place owns cache headers. Setting them in a load function means a layout and a page can
// both try, and SvelteKit throws on the second — so this reads the finished response instead.
function applyCaching(event: Parameters<Handle>[0]['event'], response: Response): void {
	const isPersonal =
		Boolean(event.locals.staff) ||
		Boolean(event.cookies.get('sid')) ||
		Boolean(event.cookies.get('cart'));

	const cacheable =
		(event.request.method === 'GET' || event.request.method === 'HEAD') &&
		response.status === 200 &&
		!isPersonal &&
		CACHEABLE.some((re) => re.test(event.url.pathname));

	response.headers.set(
		'cache-control',
		cacheable ? 'public, s-maxage=300, stale-while-revalidate=86400' : 'private, no-store'
	);
}
