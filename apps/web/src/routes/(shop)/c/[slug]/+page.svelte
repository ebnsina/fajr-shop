<script lang="ts">
	import ProductGrid from '$lib/components/ProductGrid.svelte';
	import { page } from '$app/state';

	let { data } = $props();

	/** Filters compose through the URL, so every view is shareable and cacheable. */
	/** Toggling a facet value keeps every other filter intact. */
	function facetHref(attributeId: string, value: string) {
		const key = `f.${attributeId}`;
		const current = data.selected[attributeId] ?? [];
		const next = current.includes(value)
			? current.filter((v) => v !== value)
			: [...current, value];
		return href({ [key]: next.length ? next.join(',') : null });
	}

	function href(changes: Record<string, string | null>) {
		const params = new URLSearchParams(page.url.searchParams);
		for (const [k, v] of Object.entries(changes)) {
			if (v) params.set(k, v);
			else params.delete(k);
		}
		if (!('page' in changes)) params.delete('page');
		const qs = params.toString();
		return qs ? `?${qs}` : page.url.pathname;
	}
</script>

<svelte:head>
	<title>{data.category.metaTitle ?? data.category.name} · {data.store.name}</title>
	{#if data.category.metaDescription}
		<meta name="description" content={data.category.metaDescription} />
	{/if}
</svelte:head>

<header class="head">
	<h1>{data.category.name}</h1>
	{#if data.category.description}<p>{data.category.description}</p>{/if}
</header>

<div class="controls">
	<span class="count">{data.total} {data.total === 1 ? 'product' : 'products'}</span>

	<div class="filters">
		<a href={href({ stock: data.inStockOnly ? null : '1' })} class:on={data.inStockOnly}>In stock</a>
		<a href={href({ sort: null })} class:on={data.sort === 'newest'}>Newest</a>
		<a href={href({ sort: 'price-asc' })} class:on={data.sort === 'price-asc'}>Price ↑</a>
		<a href={href({ sort: 'price-desc' })} class:on={data.sort === 'price-desc'}>Price ↓</a>
	</div>
</div>

{#if data.facets.length}
	<!-- Facets only exist where a merchant defined attributes, so fashion
	     categories show nothing here and tech ones show a real sidebar. -->
	<aside class="facets" aria-label="Filters">
		{#each data.facets as facet (facet.attributeId)}
			<fieldset>
				<legend>{facet.name}{#if facet.unit} ({facet.unit}){/if}</legend>
				{#each facet.values as v (v.value)}
					{@const on = (data.selected[facet.attributeId] ?? []).includes(v.value)}
					<a href={facetHref(facet.attributeId, v.value)} class:on aria-pressed={on} role="button">
						{v.value}
						<span class="count">{v.count}</span>
					</a>
				{/each}
			</fieldset>
		{/each}
	</aside>
{/if}

{#if data.items.length}
	<ProductGrid items={data.items} currency={data.store.currency} />

	{#if data.pages > 1}
		<nav class="pager">
			{#if data.page > 1}<a href={href({ page: String(data.page - 1) })}>← Previous</a>{/if}
			<span>Page {data.page} of {data.pages}</span>
			{#if data.page < data.pages}<a href={href({ page: String(data.page + 1) })}>Next →</a>{/if}
		</nav>
	{/if}
{:else}
	<p class="empty">Nothing here yet.</p>
{/if}

<style>
	.head h1 {
		font-family: var(--font-display);
		font-weight: 400;
		font-size: 1.75rem;
		margin: 0 0 0.25rem;
	}

	.head p {
		color: var(--c-muted);
		margin: 0;
	}

	.controls {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 1rem;
		margin: 1.5rem 0;
		padding-block-end: 1rem;
		border-block-end: 1px solid var(--c-line);
	}

	.count {
		color: var(--c-muted);
		font-size: 0.875rem;
	}

	.filters {
		display: flex;
		gap: 0.75rem;
		margin-inline-start: auto;
		font-size: 0.875rem;
	}

	.filters a {
		color: var(--c-muted);
		text-decoration: none;
		padding: 0.25rem 0.625rem;
		border: 1px solid var(--c-line);
		border-radius: var(--radius);
	}

	.filters a.on {
		color: var(--c-accent-text);
		background: var(--c-accent);
		border-color: var(--c-accent);
	}

	.pager {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 1.5rem;
		margin-block-start: 2.5rem;
		font-size: 0.875rem;
		color: var(--c-muted);
	}

	.pager a {
		color: var(--c-text);
	}

	.facets {
		display: flex;
		flex-wrap: wrap;
		gap: 1.5rem;
		margin-block-end: 1.5rem;
		padding-block-end: 1rem;
		border-block-end: 1px solid var(--c-line);
	}

	.facets fieldset {
		border: 0;
		padding: 0;
		margin: 0;
	}

	.facets legend {
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--c-muted);
		padding: 0;
		margin-block-end: 0.5rem;
	}

	.facets a {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		margin-inline-end: 0.375rem;
		margin-block-end: 0.375rem;
		padding: 0.375rem 0.75rem;
		border: 1px solid var(--c-line);
		border-radius: var(--radius);
		font-size: 0.875rem;
		text-decoration: none;
		color: inherit;
	}

	.facets a.on {
		background: var(--c-accent);
		border-color: var(--c-accent);
		color: var(--c-accent-text);
	}

	.facets .count {
		font-size: 0.75rem;
		opacity: 0.7;
	}

	.empty {
		color: var(--c-muted);
	}
</style>
