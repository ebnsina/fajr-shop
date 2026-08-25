<script lang="ts">
	import { BLOCK_COMPONENTS } from '$lib/blocks';
	import type { RenderedPage } from '@fajr/core/cms';
	import type { BlockData } from '$lib/server/renderBlocks';

	let {
		blocks,
		data,
		currency,
		locale
	}: { blocks: RenderedPage['blocks']; data: BlockData; currency: string; locale: string } = $props();
</script>

<div class="stack">
	{#each blocks as block (block.id)}
		{@const Block = BLOCK_COMPONENTS[block.type]}
		{#if Block}
			<Block
				props={block.props}
				media={data.media}
				products={data.products[block.id] ?? []}
				categories={data.categories[block.id] ?? []}
				{currency}
				{locale}
			/>
		{/if}
	{/each}
</div>

<style>
	/* Vertical stack only. No free canvas: it cannot be responsive, and a
	   section-based builder covers every real promo page. */
	.stack {
		display: flex;
		flex-direction: column;
		gap: calc(var(--grid-gap) * 1.5);
	}
</style>
