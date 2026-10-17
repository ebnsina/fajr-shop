<script lang="ts">
	import type { components } from '#lib/api.js';
	import { storefront as sf, shop as t } from '#lib/copy.js';
	import Price from './Price.svelte';
	import ProductImage from './ProductImage.svelte';

	let {
		product: p,
		eager = false
	}: { product: components['schemas']['ProductSummary']; eager?: boolean } = $props();

	// The saving on the cheapest variant, as shoppers here expect to see it: "20% off".
	const off = $derived(
		p.compare_at_price ? Math.round((1 - p.price_min / p.compare_at_price) * 100) : 0
	);
</script>

<article class={['card', !p.in_stock && 'out']}>
	<a class="media" href="/p/{p.slug}" tabindex="-1" aria-hidden="true">
		<ProductImage src={p.image?.url} alt="" ratio="1" loading={eager ? 'eager' : 'lazy'} />
		{#if !p.in_stock}<span class="flag sold">{t.soldOut}</span>
		{:else if off > 0}<span class="flag">{sf.off(off)}</span>{/if}
	</a>
	<h3><a href="/p/{p.slug}">{p.name}</a></h3>
	<Price amount={p.price_min} was={p.compare_at_price} from={p.price_min !== p.price_max} />
</article>

<style>
	.card {
		position: relative;
		display: grid;
		grid-template-rows: auto 1fr auto;
		gap: 0.5rem;
		block-size: 100%;
		box-sizing: border-box;
		min-inline-size: 0;
		padding: 0.625rem 0.625rem 0.875rem;
		border-radius: var(--ui-radius);
		background: var(--ui-surface);
		box-shadow: var(--ui-shadow-xs);
		transition: box-shadow var(--ui-dur) var(--ui-ease-out);
	}
	@media (hover: hover) {
		.card:hover {
			box-shadow: var(--ui-shadow-card);
		}
	}
	.media {
		position: relative;
		display: block;
		overflow: hidden;
		border-radius: calc(var(--ui-radius) * 0.75);
	}
	.out .media {
		opacity: 0.6;
	}
	.flag {
		position: absolute;
		inset-block-start: 0.5rem;
		inset-inline-start: 0.5rem;
		padding: 0.1875rem 0.5rem;
		border-radius: 999px;
		background: var(--ui-danger);
		color: var(--ui-on-danger);
		font-size: 0.75rem;
		font-weight: 700;
	}
	.sold {
		background: var(--ui-fg);
		color: var(--ui-bg);
	}
	h3 {
		display: -webkit-box;
		margin: 0;
		overflow: hidden;
		font-family: var(--ui-font);
		font-size: 0.9375rem;
		font-weight: 500;
		line-height: 1.35;
		-webkit-box-orient: vertical;
		-webkit-line-clamp: 2;
		line-clamp: 2;
	}
	h3 a {
		color: var(--ui-fg);
		text-decoration: none;
	}
	h3 a:hover {
		color: var(--ui-accent);
	}
	h3 a::after {
		/* The whole card is the link's target, so it's easy to tap on a phone. */
		position: absolute;
		inset: 0;
		content: '';
	}
	h3 a:focus-visible {
		outline: none;
	}
	.card:has(h3 a:focus-visible) {
		outline: var(--ui-ring-width) solid var(--ui-ring);
		outline-offset: var(--ui-ring-offset);
	}
</style>
