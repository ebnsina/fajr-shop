<script lang="ts">
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import type { components } from '#lib/api.js';
	import { storefront as sf } from '#lib/copy.js';
	import ProductCard from './ProductCard.svelte';

	// A titled row of five products, with a link to all of them.
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
		<a {href}>{sf.viewAll} <ChevronRight size={16} /></a>
	</div>
	<ul class="grid">
		{#each products.slice(0, 5) as p (p.id)}<li><ProductCard product={p} /></li>{/each}
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
	.head a:hover {
		text-decoration: underline;
	}
	.head a:focus-visible {
		outline: var(--ui-ring-width) solid var(--ui-ring);
		outline-offset: var(--ui-ring-offset);
		border-radius: 2px;
	}
	.grid {
		display: grid;
		grid-template-columns: repeat(5, minmax(0, 1fr));
		gap: 1rem;
		margin: 0;
		padding: 0;
		list-style: none;
	}
	@media (width < 64rem) {
		.grid {
			grid-template-columns: repeat(3, minmax(0, 1fr));
			gap: 0.75rem;
		}
		/* Three across: the last two wait for "View all". */
		li:nth-child(n + 4) {
			display: none;
		}
	}
	@media (width < 40rem) {
		.grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
			gap: 0.625rem;
		}
		li:nth-child(n + 4) {
			display: list-item;
		}
		li:nth-child(n + 5) {
			display: none;
		}
	}
</style>
