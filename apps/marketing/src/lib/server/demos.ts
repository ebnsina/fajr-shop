import { env } from '$env/dynamic/private';
import { DEMOS } from '$lib/content';

export type Credentials = {
	storefront: string;
	admin: string;
	email: string;
	password: string;
	resetsAt: string;
};

// Config is required, never defaulted: a demo link that quietly points at the
// wrong host is worse than a page that refuses to render.
function required(name: string): string {
	const value = env[name];
	if (!value) throw new Error(`${name} is not set — demo credentials cannot be issued`);
	return value;
}

// Kept server-side deliberately. Putting these in $lib/content would ship them
// in the client bundle and make the form in front of them decorative.
export function credentialsFor(key: string): Credentials | null {
	if (!DEMOS.some((d) => d.key === key)) return null;

	const host = required('DEMO_BASE_HOST');
	return {
		storefront: `https://${key}.${host}`,
		admin: `https://${key}.${host}/admin`,
		email: required('DEMO_EMAIL'),
		password: required('DEMO_PASSWORD'),
		resetsAt: 'Every night at 3am Dhaka time'
	};
}
