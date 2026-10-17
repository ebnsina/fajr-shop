<script lang="ts">
	import { page } from '$app/state';
	import { shop as t } from '#lib/copy.js';
	import Button from '#lib/sinaui/ui/Button.svelte';
	import EmptyState from '#lib/sinaui/ui/EmptyState.svelte';
	import ProductCard from '#lib/shop/ProductCard.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head>
	<title>{data.store.name}</title>
	<meta name="description" content={data.store.name} />
	<meta property="og:title" content={data.store.name} />
	<meta property="og:type" content="website" />
	<meta property="og:url" content={page.url.origin} />
	{#if data.store.logo_url}<meta property="og:image" content={data.store.logo_url} />{/if}
	<link rel="canonical" href={page.url.origin} />
</svelte:head>

<section class="site-container hero">
	<h1 class="site-display">{data.store.name}</h1>
	<div><Button href="/shop" size="lg">{t.all}</Button></div>
</section>

<section class="site-container block" aria-labelledby="newest">
	<div class="head">
		<h2 class="site-title" id="newest">{t.newest}</h2>
		{#if data.newest.length}<a href="/shop">{t.seeAll}</a>{/if}
	</div>
	{#if data.newest.length}
		<ul class="site-grid">
			{#each data.newest as p, i (p.id)}<li><ProductCard product={p} eager={i < 4} /></li>{/each}
		</ul>
	{:else}
		<EmptyState title={t.emptyTitle}>{t.emptyBody}</EmptyState>
	{/if}
</section>

<style>
	.hero {
		display: grid;
		gap: 1.5rem;
		padding-block: clamp(3rem, 10vw, 7rem) 1rem;
	}
	.block {
		display: grid;
		gap: 1.5rem;
		margin-block-start: 3rem;
	}
	.head {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 1rem;
	}
</style>
