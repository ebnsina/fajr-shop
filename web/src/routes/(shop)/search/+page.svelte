<script lang="ts">
	import { shop as t } from '#lib/copy.js';
	import Button from '#lib/sinaui/ui/Button.svelte';
	import SearchField from '#lib/sinaui/ui/SearchField.svelte';
	import Listing from '#lib/shop/Listing.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head>
	<title>{data.q ? t.searchResults(data.q) : t.searchTitle} · {data.store.name}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<section class="site-container top">
	{#if !data.page}<h1 class="site-title">{t.searchTitle}</h1>{/if}
	<form method="get" role="search" class="search">
		<SearchField
			label={t.search}
			hideLabel
			name="q"
			value={data.q}
			placeholder={t.searchPlaceholder}
		/>
		<Button type="submit">{t.search}</Button>
	</form>
</section>

<section class="site-container">
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
	.top {
		display: grid;
		gap: 1rem;
		padding-block: 1.5rem;
	}
	.search {
		display: flex;
		gap: 0.5rem;
		max-inline-size: 36rem;
	}
	.search > :global(:first-child) {
		flex: 1;
	}
	.note {
		color: var(--ui-muted);
	}
</style>
