<script lang="ts">
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import type { components } from '#lib/api.js';
	import { slider as s, storefront as sf } from '#lib/copy.js';
	import ProductCard from './ProductCard.svelte';

	// A titled, sideways-scrolling row of products, with a link to all of them.
	let {
		id,
		title,
		href,
		products
	}: {
		id: string;
		title: string;
		href: string;
		products: components['schemas']['ProductSummary'][];
	} = $props();

	let track = $state<HTMLElement>();
	const by = (dir: number) =>
		track?.scrollBy({ left: dir * track.clientWidth, behavior: 'smooth' });
</script>

<section class="site-container row" aria-labelledby={id}>
	<div class="head">
		<h2 class="site-title" {id}>{title}</h2>
		<a {href}>{sf.more} <ChevronRight size={16} /></a>
		<div class="arrows">
			<button type="button" aria-label={s.previous} onclick={() => by(-1)}
				><ChevronLeft size={18} /></button
			>
			<button type="button" aria-label={s.next} onclick={() => by(1)}
				><ChevronRight size={18} /></button
			>
		</div>
	</div>
	<ul class="track" bind:this={track}>
		{#each products as p (p.id)}<li><ProductCard product={p} /></li>{/each}
	</ul>
</section>

<style>
	.row {
		display: grid;
		gap: 1rem;
		margin-block-start: 2.5rem;
	}
	.head {
		display: flex;
		align-items: baseline;
		gap: 1rem;
	}
	.head h2 {
		margin-inline-end: auto;
	}
	.head a {
		display: inline-flex;
		align-items: center;
		gap: 0.125rem;
		flex: none;
		color: var(--ui-accent);
		font-size: 0.875rem;
		font-weight: 600;
		text-decoration: none;
	}
	.track {
		display: grid;
		grid-auto-flow: column;
		grid-auto-columns: calc((100% - 4 * 1rem) / 5);
		gap: 1rem;
		margin: 0;
		padding: 0 0 0.5rem;
		overflow-x: auto;
		scroll-snap-type: x mandatory;
		scrollbar-width: none;
		list-style: none;
	}
	.track::-webkit-scrollbar {
		display: none;
	}
	.arrows {
		display: flex;
		gap: 0.375rem;
		align-self: center;
	}
	.arrows button {
		display: grid;
		place-items: center;
		inline-size: 2rem;
		block-size: 2rem;
		padding: 0;
		border: 1px solid var(--ui-field-line);
		border-radius: 50%;
		background: var(--ui-surface);
		color: var(--ui-fg);
		cursor: pointer;
	}
	.arrows button:hover {
		border-color: var(--ui-accent);
		color: var(--ui-accent);
	}
	.arrows button:focus-visible {
		outline: var(--ui-ring-width) solid var(--ui-ring);
		outline-offset: var(--ui-ring-offset);
	}
	@media (hover: none) {
		.arrows {
			display: none; /* phones swipe */
		}
	}
	li {
		scroll-snap-align: start;
	}
	@media (width < 64rem) {
		.track {
			grid-auto-columns: calc((100% - 2 * 0.75rem) / 3);
			gap: 0.75rem;
		}
	}
	@media (width < 40rem) {
		.track {
			grid-auto-columns: 44%;
			gap: 0.625rem;
		}
	}
</style>
