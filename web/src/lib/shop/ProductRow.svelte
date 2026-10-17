<script lang="ts">
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import type { components } from '#lib/api.js';
	import { storefront as sf } from '#lib/copy.js';
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
</script>

<section class="site-container row" aria-labelledby={id}>
	<div class="head">
		<h2 class="site-title" {id}>{title}</h2>
		<a {href}>{sf.more} <ChevronRight size={16} /></a>
	</div>
	<ul class="track">
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
		justify-content: space-between;
		gap: 1rem;
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
		scrollbar-width: thin;
		list-style: none;
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
