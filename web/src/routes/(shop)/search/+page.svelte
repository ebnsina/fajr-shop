<script lang="ts">
	import { shop as t } from '#lib/copy.js';
	import Listing from '#lib/shop/Listing.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head>
	<title>{data.q ? t.searchResults(data.q) : t.searchTitle} · {data.store.name}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<!-- The header's search box is the one search; this page only shows what it found. -->
<section class="site-container results">
	{#if !data.page}<h1 class="site-title">{t.searchTitle}</h1>{/if}
	{#if data.page && data.filters}
		{#if data.page.items.length || data.paged}
			<Listing products={data.page} facets={data.facets} filters={data.filters} paged={data.paged}>
				{#snippet heading(count: string | null)}
					<h1 class="site-title">
						{t.searchResults(data.q)}{#if count}<span class="count"> ({count})</span>{/if}
					</h1>
				{/snippet}
			</Listing>
		{:else}
			<h1 class="site-title">{t.searchResults(data.q)}</h1>
			<p class="note">{t.searchNone(data.q)}</p>
		{/if}
	{:else}
		<p class="note">{t.searchEmpty}</p>
	{/if}
</section>

<style>
	.results {
		padding-block-start: 1.5rem;
	}
	.note {
		color: var(--ui-muted);
	}
</style>
