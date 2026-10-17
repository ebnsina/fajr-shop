<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';

	interface Props extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
		title?: string;
		description?: string;
		/** Heading level for the title, to fit the page's outline. */
		level?: 2 | 3 | 4;
		/** Makes the whole card a link; the title becomes the link text screen readers announce. */
		href?: string;
		children?: Snippet;
		footer?: Snippet;
	}

	let {
		title,
		description,
		level = 3,
		href,
		children,
		footer,
		class: className,
		...rest
	}: Props = $props();
</script>

<!-- A section, labeled by its title. With href, the title's link stretches over the whole card
     (a single link, not a link wrapping the card), so screen readers hear one clear name. -->
<article class={['card', href && 'linked', className]} {...rest}>
	{#if title}
		<svelte:element this={`h${level}`} class="title">
			{#if href}<a {href}>{title}</a>{:else}{title}{/if}
		</svelte:element>
	{/if}
	{#if description}<p class="description">{description}</p>{/if}
	{#if children}<div class="content">{@render children()}</div>{/if}
	{#if footer}<div class="footer">{@render footer()}</div>{/if}
</article>

<style>
	/* A surface with a soft shadow; no outline. */
	.card {
		position: relative;
		box-sizing: border-box;
		padding: 1.25rem;
		/* Invisible normally; outlines it in Windows High Contrast. */
		border: 1px solid transparent;
		border-radius: calc(var(--ui-radius) * 1.5);
		background: var(--ui-surface);
		color: var(--ui-fg);
		font: 0.9375rem/1.5 var(--ui-font);
		box-shadow: var(--ui-shadow-card);
	}
	.title {
		margin: 0;
		font-size: 1rem;
		font-weight: 600;
		letter-spacing: -0.01em;
	}
	.title a {
		color: inherit;
		text-decoration: none;
	}
	/* The link's hit area covers the whole card. */
	.title a::after {
		content: '';
		position: absolute;
		inset: 0;
		border-radius: inherit;
	}
	.linked:has(a:focus-visible) {
		outline: var(--ui-ring-width) solid var(--ui-ring);
		outline-offset: var(--ui-ring-offset);
	}
	.title a:focus-visible {
		outline: none;
	}
	.linked {
		transition: transform var(--ui-dur-press) var(--ui-ease-out);
	}
	@media (hover: hover) and (pointer: fine) {
		.linked:hover {
			transform: translateY(-2px);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.linked:hover {
			transform: none;
		}
	}
	.description {
		margin: 0.25rem 0 0;
		color: var(--ui-muted);
	}
	.content {
		margin-block-start: 1rem;
	}
	.title + .content {
		margin-block-start: 0.75rem;
	}
	/* Actions sit at the end, main action last; wrapping keeps it on the bottom row, like Dialog. */
	.footer {
		display: flex;
		flex-wrap: wrap-reverse;
		justify-content: flex-end;
		gap: 0.5rem;
		margin-block-start: 1.25rem;
	}
	/* Controls inside a linked card stay clickable above the stretched link. */
	.linked :is(.content, .footer) :global(:is(a, button, input, select, textarea, label)) {
		position: relative;
		z-index: 1;
	}
</style>
