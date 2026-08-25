import { error } from '@sveltejs/kit';

// The sidebar hides what a role cannot do, but hiding is not enforcing: a
// direct POST reaches the action anyway. Every write goes through here.
export function requirePermission(locals: App.Locals, permission: string): void {
	const held = locals.staff?.permissions ?? [];
	if (held.includes('*') || held.includes(permission)) return;
	error(403, 'You do not have permission to do that.');
}

type Handler = (event: { locals: App.Locals } & never) => unknown;

// Wraps a whole actions object, so an action added later is guarded by
// construction rather than by whoever remembers to add a line. Generic over the
// handlers so each route keeps its own params typing.
export function guardActions<T extends Record<string, Handler>>(permission: string, actions: T): T {
	const guarded: Record<string, Handler> = {};
	for (const [name, handler] of Object.entries(actions)) {
		guarded[name] = ((event: { locals: App.Locals }) => {
			requirePermission(event.locals, permission);
			return (handler as (e: unknown) => unknown)(event);
		}) as Handler;
	}
	return guarded as T;
}
