<script lang="ts">
	import { ArrowRight01Icon } from '@hugeicons/core-free-icons';
	import type { components } from '#lib/api.js';
	import { storefront as sf } from '#lib/copy.js';
	import Icon from '#lib/sinaui/ui/Icon.svelte';
	import ProductCard from './ProductCard.svelte';

	// A titled row of products with a "More products" link to the full list.
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

<section class="site-container section" aria-labelledby={id}>
	<div class="head">
		<h2 class="site-title" {id}>{title}</h2>
		<a {href}>{sf.more} <Icon icon={ArrowRight01Icon} size={16} /></a>
	</div>
	<ul class="site-grid">
		{#each products as p (p.id)}<li><ProductCard product={p} /></li>{/each}
	</ul>
</section>

<style>
	.section {
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
		gap: 0.25rem;
		flex: none;
		color: var(--ui-accent);
		font-size: 0.9375rem;
		font-weight: 600;
		text-decoration: none;
	}
</style>
