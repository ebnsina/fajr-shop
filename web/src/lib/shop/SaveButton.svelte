<script lang="ts">
	import { FavouriteIcon } from '@hugeicons/core-free-icons';
	import Icon from '#lib/sinaui/ui/Icon.svelte';
	import { page } from '$app/state';
	import { wishlist as w } from '#lib/copy.js';

	// The heart that saves a product to the wishlist. Signed out, it leads to sign-in and back.
	let { id, name, label = false }: { id: string; name: string; label?: boolean } = $props();

	const saved = $derived(((page.data.saved as string[] | undefined) ?? []).includes(id));
	const next = $derived(encodeURIComponent(page.url.pathname + page.url.search));
</script>

{#if page.data.me}
	<!-- Belongs to the one wishlist form in the shop layout, so it works inside other forms too. -->
	<button
		type="submit"
		form="wishlist-form"
		name="toggle"
		value="{id}:{saved ? '0' : '1'}"
		class={['heart', label && 'labelled', saved && 'on']}
		aria-pressed={saved}
		aria-label={saved ? w.unsave(name) : w.save(name)}
	>
		<Icon icon={FavouriteIcon} size={18} fill={saved ? 'currentColor' : 'none'} />
		{#if label}<span>{saved ? w.saved : w.saveLabel}</span>{/if}
	</button>
{:else}
	<a
		class={['heart', label && 'labelled']}
		href="/account/login?next={next}"
		aria-label={w.signIn}
		title={w.signIn}
	>
		<Icon icon={FavouriteIcon} size={18} />
		{#if label}<span>{w.saveLabel}</span>{/if}
	</a>
{/if}

<style>
	.heart {
		position: relative;
		z-index: 2; /* above the card's whole-card link */
		display: inline-grid;
		grid-auto-flow: column;
		place-items: center;
		gap: 0.375rem;
		inline-size: 2.25rem;
		block-size: 2.25rem;
		padding: 0;
		border: 1px solid var(--border);
		border-radius: 50%;
		background: var(--bg-surface);
		color: var(--text-secondary);
		font: 500 0.875rem var(--ui-font);
		text-decoration: none;
		cursor: pointer;
	}
	.labelled {
		inline-size: auto;
		padding-inline: 0.875rem;
		border-radius: var(--ui-radius-control);
		block-size: 2.5rem;
	}
	.heart:hover {
		border-color: var(--brand-600);
		color: var(--brand-700);
	}
	/* Saved: filled heart in the brand color, and the pressed state says so to screen readers. */
	.on {
		border-color: var(--brand-600);
		color: var(--brand-700);
	}
	.heart:focus-visible {
		outline: var(--ui-ring-width) solid var(--ui-ring);
		outline-offset: var(--ui-ring-offset);
	}
</style>
