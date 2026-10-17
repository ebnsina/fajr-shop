<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { getTabs } from './context';

	interface Props extends HTMLAttributes<HTMLDivElement> {
		value: string;
		children: Snippet;
	}

	let { value, children, class: className, ...rest }: Props = $props();
	const tabs = getTabs();
	const ids = $derived(tabs.ids(value));

	// A panel is a Tab stop only when nothing inside can take focus (React Aria's useTabPanel):
	// otherwise Tab goes straight to its first control, not to the panel and then the control.
	const focusable =
		'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"]), [contenteditable]';
	let empty = $state(true);
	const watch = (el: HTMLElement) => {
		const check = () => (empty = !el.querySelector(focusable));
		const mo = new MutationObserver(check);
		mo.observe(el, { childList: true, subtree: true });
		check();
		return () => mo.disconnect();
	};
</script>

<!-- Hidden, not unmounted: aria-controls must always point at an element that exists, and panel state survives switching. -->
<div
	role="tabpanel"
	id={ids.panel}
	aria-labelledby={ids.tab}
	tabindex={empty ? 0 : undefined}
	{@attach watch}
	hidden={tabs.value !== value}
	class={['panel', className]}
	{...rest}
>
	{@render children()}
</div>

<style>
	.panel {
		flex: 1;
		min-inline-size: 0;
		border-radius: var(--ui-radius);
	}
	/* Beside a vertical list: the first line centers on the first tab (min-block-size 2.5rem). */
	:global(.tabs[data-orientation='vertical']) > .panel {
		padding-block-start: calc((2.5rem - 1lh) / 2);
	}
	@media (pointer: coarse) {
		:global(.tabs[data-orientation='vertical']) > .panel {
			padding-block-start: calc((2.75rem - 1lh) / 2);
		}
	}
	.panel:focus-visible {
		outline: var(--ui-ring-width) solid var(--ui-ring);
		outline-offset: var(--ui-ring-offset);
	}
</style>
