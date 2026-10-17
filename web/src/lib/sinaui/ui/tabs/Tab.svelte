<script lang="ts">
	import { untrack, type Snippet } from 'svelte';
	import type { HTMLButtonAttributes } from 'svelte/elements';
	import { getTabs } from './context';

	interface Props extends Omit<HTMLButtonAttributes, 'value'> {
		value: string;
		children: Snippet;
	}

	let { value, children, class: className, ...rest }: Props = $props();
	const tabs = getTabs();
	// Unset value: the first enabled tab claims it during render, so server HTML already shows its panel.
	untrack(() => {
		if (tabs.value === undefined && !rest.disabled) tabs.select(value);
	});
	const ids = $derived(tabs.ids(value));
	const selected = $derived(tabs.value === value);
</script>

<!-- Roving tabindex: only the selected tab is in the Tab order; arrows move between the rest. -->
<button
	type="button"
	role="tab"
	id={ids.tab}
	aria-controls={ids.panel}
	aria-selected={selected}
	tabindex={selected ? 0 : -1}
	class={['tab', className]}
	{...rest}
	onclick={(e) => {
		tabs.select(value);
		rest.onclick?.(e);
	}}
>
	{@render children()}
</button>

<style>
	.tab {
		box-sizing: border-box;
		position: relative;
		flex: none;
		min-block-size: 2.5rem;
		padding: 0 0.875rem;
		/* Invisible normally; outlines the tab in Windows High Contrast. */
		border: 1px solid transparent;
		border-radius: var(--ui-radius);
		background: transparent;
		color: var(--ui-muted);
		font: inherit;
		font-weight: 500;
		line-height: 1;
		letter-spacing: -0.005em;
		text-align: start;
		white-space: nowrap;
		cursor: pointer;
		-webkit-tap-highlight-color: transparent;
		transition: color var(--ui-dur-press) ease;
	}
	@media (pointer: coarse) {
		.tab {
			min-block-size: 2.75rem;
		}
	}
	@media (hover: hover) and (pointer: fine) {
		.tab:hover:not(:disabled, [aria-selected='true']) {
			color: var(--ui-fg);
		}
	}
	.tab:focus-visible {
		outline: var(--ui-ring-width) solid var(--ui-ring);
		/* Inset: the tab strip scrolls on narrow screens, and a scroll container clips outer rings. */
		outline-offset: calc(-1 * var(--ui-ring-width));
	}
	.tab[aria-selected='true'] {
		color: var(--ui-accent);
	}
	.tab:disabled {
		opacity: 0.55;
		cursor: not-allowed;
	}
	/* Before hydration the sliding bar isn't measured yet: the tab draws the same bar itself, so
	   the hand-over is invisible (an inset shadow would curve with the tab's corners). */
	:global([role='tablist']:not([data-ready])) > .tab[aria-selected='true']::after {
		content: '';
		position: absolute;
		inset: auto -1px -1px;
		block-size: 3px;
		border-radius: 3px 3px 0 0;
		background: var(--ui-accent);
	}
	:global([role='tablist'][aria-orientation='vertical']:not([data-ready]))
		> .tab[aria-selected='true']::after {
		inset-block: -1px;
		inset-inline: auto -1px;
		inline-size: 3px;
		block-size: auto;
		border-radius: 0;
		border-start-start-radius: 3px;
		border-end-start-radius: 3px;
	}
</style>
