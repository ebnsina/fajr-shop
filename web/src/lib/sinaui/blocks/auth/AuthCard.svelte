<script lang="ts" module>
	import type { GoogleIcon } from '@hugeicons/core-free-icons';

	/** "Continue with …" sign-in, e.g. { id: 'google', label: 'Google', icon: GoogleIcon }. */
	export type Provider = { id: string; label: string; icon?: typeof GoogleIcon };
</script>

<script lang="ts">
	import type { Snippet } from 'svelte';
	import Button from '../../ui/Button.svelte';
	import Icon from '../../ui/Icon.svelte';
	import Separator from '../../ui/Separator.svelte';

	// The card every auth block sits in: heading, optional provider buttons, the form, a footer line.
	let {
		title,
		description,
		providers = [],
		onprovider,
		busy = false,
		children,
		footer
	}: {
		title: string;
		description?: Snippet | string;
		providers?: Provider[];
		onprovider?: (id: string) => void;
		/** While a provider or the form is working, the provider buttons wait. */
		busy?: boolean;
		children: Snippet;
		footer?: Snippet;
	} = $props();
	const id = $props.id();
</script>

<section class="auth" aria-labelledby="{id}-title">
	<header>
		<h2 id="{id}-title">{title}</h2>
		{#if typeof description === 'string'}<p>{description}</p>
		{:else if description}<p>{@render description()}</p>{/if}
	</header>

	{#if providers.length}
		<div class="providers">
			{#each providers as p (p.id)}
				<Button variant="secondary" disabled={busy} onclick={() => onprovider?.(p.id)}>
					{#if p.icon}<Icon icon={p.icon} size={18} />{/if}
					Continue with {p.label}
				</Button>
			{/each}
		</div>
		<Separator>or</Separator>
	{/if}

	{@render children()}

	{#if footer}<p class="footer">{@render footer()}</p>{/if}
</section>

<style>
	.auth {
		display: grid;
		gap: 1.25rem;
		box-sizing: border-box;
		inline-size: min(26rem, 100%);
		padding: 2rem 1.75rem;
		/* Invisible normally; outlines it in Windows High Contrast. */
		border: 1px solid transparent;
		border-radius: calc(var(--ui-radius) * 1.5);
		background: var(--ui-surface);
		box-shadow: var(--ui-shadow-card);
		color: var(--ui-fg);
		font: 0.9375rem/1.5 var(--ui-font);
	}
	header {
		display: grid;
		gap: 0.375rem;
	}
	h2 {
		margin: 0;
		font-size: 1.375rem;
		font-weight: 600;
		letter-spacing: -0.01em;
	}
	header p,
	.footer {
		margin: 0;
		color: var(--ui-muted);
	}
	/* Its own link style, so links still read as links under an app's CSS reset. */
	.auth :global(a) {
		color: color-mix(in srgb, var(--ui-accent) 80%, var(--ui-fg));
		text-decoration: underline;
		text-underline-offset: 0.2em;
	}
	.providers {
		display: grid;
		gap: 0.5rem;
	}
	.footer {
		font-size: 0.875rem;
		text-align: center;
	}
	@media (width < 30rem) {
		.auth {
			padding: 1.5rem 1.25rem;
		}
	}
</style>
