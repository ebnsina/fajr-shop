<script lang="ts">
	import { wishlist as w } from '#lib/copy.js';
	import Button from '#lib/sinaui/ui/Button.svelte';
	import EmptyState from '#lib/sinaui/ui/EmptyState.svelte';
	import ProductCard from '#lib/shop/ProductCard.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head>
	<title>{w.title} · {data.store.name}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<section class="site-container page">
	<h1 class="site-title">{w.title}</h1>
	{#if data.items.length}
		<ul class="site-grid">
			{#each data.items as p (p.id)}<li><ProductCard product={p} /></li>{/each}
		</ul>
	{:else}
		<EmptyState title={w.emptyTitle}>
			{w.emptyBody}
			{#snippet actions()}<Button href="/shop">{w.browse}</Button>{/snippet}
		</EmptyState>
	{/if}
</section>

<style>
	.page {
		display: grid;
		gap: 1.25rem;
		padding-block: 2rem 3rem;
	}
	.page h1 {
		margin: 0;
	}
	ul {
		margin: 0;
		padding: 0;
		list-style: none;
	}
</style>
