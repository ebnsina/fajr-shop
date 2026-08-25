<script lang="ts">
	import BlockList from '$lib/components/BlockList.svelte';
	import ProductGrid from '$lib/components/ProductGrid.svelte';

	let { data } = $props();
</script>


{#if data.page && data.blocks}
	<BlockList blocks={data.page.blocks} data={data.blocks} currency={data.store.currency} />
{:else if data.fallback}
	<!-- No home page built yet. Still a shop, not an empty screen. -->
	<section class="intro">
		<h1>{data.store.name}</h1>
		<p>Cash on delivery across Bangladesh.</p>
	</section>

	{#if data.fallback.categories.length}
		<nav class="tiles" aria-label="Categories">
			{#each data.fallback.categories as c (c.id)}
				<a href="/c/{c.slug}">{c.name}</a>
			{/each}
		</nav>
	{/if}

	<section>
		<h2>New arrivals</h2>
		{#if data.fallback.newest.length}
			<ProductGrid items={data.fallback.newest} currency={data.store.currency} />
		{:else}
			<p class="empty">Nothing published yet.</p>
		{/if}
	</section>
{/if}

<style>
	.intro {
		text-align: center;
		padding: 3rem 0 2rem;
	}

	h1 {
		font-family: var(--font-display);
		font-size: clamp(2rem, 5vw, 3rem);
		font-weight: 400;
		margin: 0 0 0.5rem;
	}

	.intro p {
		color: var(--c-muted);
		margin: 0;
	}

	.tiles {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 0.75rem;
		margin-block-end: 3rem;
	}

	.tiles a {
		padding: 0.5rem 1.25rem;
		border: 1px solid var(--c-line);
		border-radius: 999px;
		text-decoration: none;
		color: inherit;
		font-size: 0.9375rem;
	}

	.tiles a:hover {
		background: var(--c-surface);
	}

	h2 {
		font-family: var(--font-display);
		font-weight: 400;
		font-size: 1.5rem;
		margin: 0 0 1rem;
	}

	.empty {
		color: var(--c-muted);
	}
</style>
