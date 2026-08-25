<script lang="ts">
	import ProductGrid from '$lib/components/ProductGrid.svelte';
	let { data } = $props();
</script>

<svelte:head><title>{data.q ? `“${data.q}”` : 'Search'} · {data.store.name}</title></svelte:head>

<h1>{data.q ? `${data.total} results for “${data.q}”` : 'Search'}</h1>

{#if data.items.length}
	<ProductGrid items={data.items} currency={data.store.currency} />
{:else if data.q}
	<p class="empty">Nothing matched. Try a shorter search.</p>
{/if}

<style>
	h1 {
		font-family: var(--font-display);
		font-weight: 400;
		font-size: 1.375rem;
		margin: 0 0 1.5rem;
	}
	.empty {
		color: var(--c-muted);
	}
</style>
