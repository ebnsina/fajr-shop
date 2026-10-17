<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { Search01Icon } from '@hugeicons/core-free-icons';
	import Icon from './Icon.svelte';

	interface Props {
		title: string;
		icon?: typeof Search01Icon;
		/** Heading level, to fit the page's outline. */
		level?: 1 | 2 | 3 | 4 | 5 | 6;
		/** What happened and what to do about it. */
		children?: Snippet;
		/** Buttons or links: the way out. */
		actions?: Snippet;
		class?: string;
	}

	let { title, icon, level = 2, children, actions, class: className }: Props = $props();
</script>

<div class={['empty', className]}>
	{#if icon}<span class="icon"><Icon {icon} size={22} /></span>{/if}
	<svelte:element this={`h${level}`} class="title">{title}</svelte:element>
	{#if children}<div class="body">{@render children()}</div>{/if}
	{#if actions}<div class="actions">{@render actions()}</div>{/if}
</div>

<style>
	.empty {
		display: grid;
		justify-items: center;
		gap: 0.5rem;
		padding: 2.5rem 1.5rem;
		color: var(--ui-fg);
		font: 0.9375rem/1.5 var(--ui-font);
		text-align: center;
		/* Rises in when it replaces content, so the change doesn't read as a glitch. */
		transition:
			opacity var(--ui-dur-overlay) var(--ui-ease-out),
			translate var(--ui-dur-overlay) var(--ui-ease-out);
	}
	.icon {
		display: grid;
		place-items: center;
		inline-size: 3rem;
		block-size: 3rem;
		margin-block-end: 0.25rem;
		border-radius: 50%;
		background: var(--ui-subtle);
		color: var(--ui-muted);
		transition: scale 400ms var(--ui-ease-out) 60ms;
	}
	@starting-style {
		.empty {
			opacity: 0;
			translate: 0 6px;
		}
		.icon {
			scale: 0.85;
		}
	}
	.title {
		margin: 0;
		font-size: 1rem;
		font-weight: 600;
		text-wrap: balance;
	}
	.body {
		max-inline-size: 36ch;
		color: var(--ui-muted);
		font-size: 0.875rem;
		text-wrap: pretty;
	}
	.body :global(p) {
		margin: 0;
	}
	.actions {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 0.5rem;
		margin-block-start: 0.75rem;
	}
	/* Once they wrap, each action spans the row, so stacked buttons share one width. */
	.actions > :global(*) {
		flex: 1 1 auto;
	}
	/* Reduced motion: it's simply there, no fade. */
	@media (prefers-reduced-motion: reduce) {
		.empty {
			transition: none;
		}
		.icon {
			transition: none;
		}
	}
</style>
