<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import {
		Alert02Icon,
		AlertCircleIcon,
		Cancel01Icon,
		CheckmarkCircle02Icon,
		InformationCircleIcon
	} from '@hugeicons/core-free-icons';
	import Icon from './Icon.svelte';

	interface Props extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
		tone?: 'info' | 'success' | 'warning' | 'danger';
		title: string;
		/**
		 * Announce it when it appears (a result the person is waiting on). Leave off for content that is
		 * simply on the page: screen readers read it in order like any other text.
		 */
		live?: boolean;
		/** Shows a close button; called when it's pressed. */
		ondismiss?: () => void;
		/** Accessible name of the close button; translate it for non-English UIs. */
		dismissLabel?: string;
		children?: Snippet;
		actions?: Snippet;
	}

	let {
		tone = 'info',
		title,
		live = false,
		ondismiss,
		dismissLabel = 'Dismiss',
		children,
		actions,
		class: className,
		...rest
	}: Props = $props();

	const icons = {
		info: InformationCircleIcon,
		success: CheckmarkCircle02Icon,
		warning: Alert02Icon,
		danger: AlertCircleIcon
	};
</script>

<div
	class={['alert', tone, className]}
	role={live ? (tone === 'danger' ? 'alert' : 'status') : undefined}
	{...rest}
>
	<span class="icon"><Icon icon={icons[tone]} /></span>
	<div class="body">
		<p class="title">{title}</p>
		{#if children}<div class="text">{@render children()}</div>{/if}
		{#if actions}<div class="actions">{@render actions()}</div>{/if}
	</div>
	{#if ondismiss}
		<button type="button" class="close" aria-label={dismissLabel} onclick={ondismiss}>
			<Icon icon={Cancel01Icon} size={16} />
		</button>
	{/if}
</div>

<style>
	/* A see-through tint of the tone behind normal text: no outline, readable on any background. */
	.alert {
		--tone: var(--ui-muted);
		display: flex;
		align-items: flex-start;
		gap: 0.75rem;
		box-sizing: border-box;
		/* Fills its column, so a short alert is as wide as its neighbors. */
		inline-size: 100%;
		padding: 0.875rem 1rem;
		/* Invisible normally; outlines it in Windows High Contrast. */
		border: 1px solid transparent;
		border-radius: calc(var(--ui-radius) * 1.5);
		background: color-mix(in srgb, var(--tone) 10%, transparent);
		color: var(--ui-fg);
		font: 0.9375rem/1.5 var(--ui-font);
	}
	.success {
		--tone: var(--ui-accent);
	}
	.warning {
		--tone: var(--ui-warning);
	}
	.danger {
		--tone: var(--ui-danger);
	}
	.icon {
		display: grid;
		flex: none;
		padding-block-start: 0.125rem;
		color: var(--tone);
	}
	.body {
		flex: 1;
		min-inline-size: 0;
	}
	.title {
		margin: 0;
		font-weight: 600;
	}
	.text {
		margin-block-start: 0.125rem;
		color: var(--ui-muted);
	}
	.text :global(p) {
		margin: 0;
	}
	.actions {
		display: flex;
		flex-wrap: wrap-reverse;
		justify-content: flex-end;
		gap: 0.5rem;
		margin-block-start: 0.75rem;
	}
	.close {
		box-sizing: border-box;
		display: grid;
		flex: none;
		place-items: center;
		inline-size: 1.75rem;
		block-size: 1.75rem;
		margin-block: -0.125rem 0;
		margin-inline: 0 -0.375rem;
		border: 1px solid transparent;
		border-radius: var(--ui-radius);
		background: transparent;
		color: var(--ui-muted);
		cursor: pointer;
	}
	@media (pointer: coarse) {
		.close {
			inline-size: 2.75rem;
			block-size: 2.75rem;
			margin-block: -0.625rem;
		}
	}
	@media (hover: hover) and (pointer: fine) {
		.close:hover {
			background: color-mix(in srgb, var(--tone) 12%, transparent);
			color: var(--ui-fg);
		}
	}
	.close:focus-visible {
		outline: var(--ui-ring-width) solid var(--ui-ring);
		outline-offset: var(--ui-ring-offset);
	}
</style>
