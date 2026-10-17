import type { Attachment } from 'svelte/attachments';

/** One message per field name. `form` is for the whole form, shown above the button. */
export type Errors = Record<string, string | undefined>;

type Field = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
type Check = Exclude<keyof ValidityState, 'valid'>;

interface Options {
	/** Your wording for the browser's own checks, per field: { email: { valueMissing: 'Enter your email.' } }. */
	messages?: Record<string, Partial<Record<Check, string>>>;
	/** Checks the browser can't do (across fields, custom controls). Return a message per failing field. */
	validate?: (data: FormData) => Errors;
	/**
	 * Runs once every check passes. Return errors (mapped from your API's error codes) to show them;
	 * a throw shows a generic message, never the raw error text.
	 */
	onsubmit: (data: FormData) => Promise<Errors | void> | Errors | void;
	/** Shown when onsubmit throws (network down, server error). */
	failed?: string;
}

/**
 * Forms with the browser's own constraint validation (required, type, min, pattern...) and no library.
 * Errors appear when a field is left or the form is sent, and clear as soon as they're fixed.
 * Without JavaScript, the browser's built-in validation still runs.
 */
export function createForm(options: Options) {
	let errors = $state<Errors>({});
	let submitting = $state(false);
	let form: HTMLFormElement | undefined;

	const fields = () =>
		[...(form?.elements ?? [])].filter(
			(e): e is Field => 'validity' in e && !!(e as Field).name && !(e as Field).disabled
		);

	function messageFor(field: Field, custom: Errors): string | undefined {
		if (custom[field.name]) return custom[field.name];
		if (field.validity.valid) return undefined;
		const failed = (Object.keys(options.messages?.[field.name] ?? {}) as Check[]).find(
			(k) => field.validity[k]
		);
		return (failed && options.messages?.[field.name]?.[failed]) || field.validationMessage;
	}

	/** Checks the named fields (all when omitted) and returns true when they pass. */
	function check(names?: string[]): boolean {
		const custom = options.validate?.(new FormData(form)) ?? {};
		const next: Errors = { ...errors, form: undefined };
		let ok = true;
		for (const f of fields()) {
			if (names && !names.includes(f.name)) continue;
			next[f.name] = messageFor(f, custom);
			if (next[f.name]) ok = false;
		}
		// Custom errors for fields the browser can't see (hidden inputs behind custom controls).
		for (const [name, msg] of Object.entries(custom))
			if (!names || names.includes(name)) {
				if (!fields().some((f) => f.name === name)) next[name] = msg;
				if (msg) ok = false;
			}
		errors = next;
		return ok;
	}

	function focusFirstError() {
		const first = fields().find((f) => errors[f.name]);
		first?.focus();
	}

	async function submit(e: SubmitEvent) {
		e.preventDefault();
		if (submitting) return;
		if (!check()) return focusFirstError();
		submitting = true;
		try {
			const result = await options.onsubmit(new FormData(form));
			if (result) {
				errors = result;
				focusFirstError();
			}
		} catch {
			errors = {
				form: options.failed ?? "Couldn't send the form. Check your connection and try again."
			};
		} finally {
			submitting = false;
		}
	}

	const attach: Attachment<HTMLFormElement> = (el) => {
		form = el;
		// We show the messages; the browser's own bubbles would cover them.
		el.noValidate = true;
		// Checked when left after a change, not while typing (no "invalid email" after one letter),
		// and not when merely tabbed past: an untouched empty field waits for the submit.
		// eslint-disable-next-line svelte/prefer-svelte-reactivity -- tracks touched fields for blur checks; nothing renders from it
		const changed = new Set<string>();
		const left = (e: Event) => {
			const name = (e.target as Field).name;
			if (name && changed.has(name)) check([name]);
		};
		// Once a field shows an error, it clears the moment it's fixed.
		const typed = (e: Event) => {
			const name = (e.target as Field).name;
			if (!name) return;
			changed.add(name);
			if (errors[name]) check([name]);
		};
		// A reset button clears the messages along with the values.
		const reset = () => {
			errors = {};
			changed.clear();
		};
		el.addEventListener('focusout', left);
		el.addEventListener('input', typed);
		el.addEventListener('change', typed);
		el.addEventListener('submit', submit);
		el.addEventListener('reset', reset);
		return () => {
			el.removeEventListener('focusout', left);
			el.removeEventListener('input', typed);
			el.removeEventListener('change', typed);
			el.removeEventListener('submit', submit);
			el.removeEventListener('reset', reset);
			form = undefined;
		};
	};

	return {
		attach,
		get errors() {
			return errors;
		},
		get submitting() {
			return submitting;
		}
	};
}
