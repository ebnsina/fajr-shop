import { error } from '@sveltejs/kit';

// The sidebar hides what a role cannot do, but hiding is not enforcing: a
// direct POST reaches the action anyway. Every action a role should not run
// belongs behind this.
export function requirePermission(
	locals: App.Locals,
	permission: string
): asserts locals is App.Locals & { staff: NonNullable<App.Locals['staff']> } {
	const held = locals.staff?.permissions ?? [];
	if (held.includes('*') || held.includes(permission)) return;
	error(403, 'You do not have permission to do that.');
}
