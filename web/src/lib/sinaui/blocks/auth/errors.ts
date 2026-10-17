import type { Errors } from '../../ui/form.svelte.js';

// Your API's error codes, in plain words. Throw an Error with one of these as `code` from a
// callback; anything else shows the general message, never the raw error text.
export const messages: Record<string, { field?: string; message: string }> = {
	invalid_credentials: { message: 'That email and password don’t match. Try again.' },
	email_taken: { field: 'email', message: 'There’s already an account with this email.' },
	weak_password: { field: 'password', message: 'Choose a longer, less common password.' },
	invalid_code: { field: 'code', message: 'That code isn’t right. Check it and try again.' },
	code_expired: { field: 'code', message: 'That code has expired. Send a new one.' },
	link_expired: { message: 'This link has expired. Ask for a new one.' },
	too_many_attempts: { message: 'Too many tries. Wait a few minutes, then try again.' }
};

/** An error thrown by a callback, as messages for the form: by field where it belongs to one. */
export function toErrors(error: unknown): Errors {
	const code = (error as { code?: unknown } | null)?.code;
	const known = typeof code === 'string' ? messages[code] : undefined;
	if (!known) return { form: 'Something went wrong. Try again.' };
	return { [known.field ?? 'form']: known.message };
}
