export type ToastKind = 'default' | 'success' | 'error';

export interface Toast {
	id: number;
	message: string;
	description?: string;
	kind: ToastKind;
	/** One action, e.g. Undo. Toasts with an action stay 2x longer so there's time to reach it. */
	action?: { label: string; onclick: () => void };
	/** Milliseconds before it leaves on its own; paused while hovered, focused, or the tab is hidden. */
	duration: number;
}

type Options = Partial<Omit<Toast, 'id' | 'message' | 'kind'>>;

/** The live list the <Toaster> renders. Push via toast(), never directly. */
export const toasts = $state<Toast[]>([]);
let next = 0;

function add(message: string, kind: ToastKind, opts: Options = {}) {
	const base = kind === 'error' ? 8000 : 5000;
	const t: Toast = { id: ++next, message, kind, duration: opts.action ? base * 2 : base, ...opts };
	toasts.push(t);
	return t.id;
}

export function toast(message: string, opts?: Options) {
	return add(message, 'default', opts);
}
toast.success = (message: string, opts?: Options) => add(message, 'success', opts);
toast.error = (message: string, opts?: Options) => add(message, 'error', opts);

export function dismiss(id: number) {
	const i = toasts.findIndex((t) => t.id === id);
	if (i !== -1) toasts.splice(i, 1);
}
