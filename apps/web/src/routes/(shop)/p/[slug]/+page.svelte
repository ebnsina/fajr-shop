<script lang="ts">
	import BlockList from '$lib/components/BlockList.svelte';

	let { data } = $props();
</script>

<svelte:head>
	<title>{data.page.metaTitle ?? data.page.title} · {data.store.name}</title>
	{#if data.page.metaDescription}
		<meta name="description" content={data.page.metaDescription} />
	{/if}
	{#if data.isPreview}<meta name="robots" content="noindex" />{/if}
</svelte:head>

{#if data.isPreview}
	<p class="preview">Preview — this page is not published.</p>
{/if}

<BlockList blocks={data.page.blocks} data={data.blocks} currency={data.store.currency} />

<style>
	.preview {
		margin: 0 0 1.5rem;
		padding: 0.625rem 1rem;
		border-radius: var(--radius);
		background: var(--c-sale);
		color: #fff;
		font-size: 0.875rem;
		text-align: center;
	}
</style>
