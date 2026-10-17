<script lang="ts">
	import type { components } from '#lib/api.js';
	import Star from '@lucide/svelte/icons/star';
	import { ratings as r, storefront as sf, shop as t } from '#lib/copy.js';
	import Price from './Price.svelte';
	import SaveButton from './SaveButton.svelte';
	import ProductImage from './ProductImage.svelte';

	let {
		product: p,
		eager = false
	}: { product: components['schemas']['ProductSummary']; eager?: boolean } = $props();

	// The saving on the cheapest variant, as shoppers here expect to see it: "20% off".
	const one = new Intl.NumberFormat('en-BD', {
		minimumFractionDigits: 1,
		maximumFractionDigits: 1
	});
	const off = $derived(
		p.compare_at_price ? Math.round((1 - p.price_min / p.compare_at_price) * 100) : 0
	);
</script>

<article class={['card', !p.in_stock && 'out']}>
	<div class="media">
		<ProductImage src={p.image?.url} alt="" ratio="1" loading={eager ? 'eager' : 'lazy'} />
		{#if !p.in_stock}<span class="flag sold">{t.soldOut}</span>
		{:else if off > 0}<span class="flag">{sf.off(off)}</span>{/if}
		<span class="save"><SaveButton id={p.id} name={p.name} /></span>
	</div>
	{#if p.brand}<p class="brand">{p.brand}</p>{/if}
	<div class="body">
		<h3><a href="/p/{p.slug}">{p.name}</a></h3>
		{#if p.rating_count && p.rating_average}
			<p class="rating" aria-label={r.stars(one.format(p.rating_average), p.rating_count)}>
				<Star size={14} fill="currentColor" aria-hidden="true" />
				<span aria-hidden="true">{one.format(p.rating_average)} ({p.rating_count})</span>
			</p>
		{/if}
	</div>
	<Price amount={p.price_min} was={p.compare_at_price} from={p.price_min !== p.price_max} />
</article>

<style>
	.card {
		position: relative;
		display: grid;
		grid-template-rows: auto auto 1fr auto;
		gap: 0.375rem;
		block-size: 100%;
		box-sizing: border-box;
		min-inline-size: 0;
		padding: 0.625rem 0.625rem 0.875rem;
		border: 1px solid var(--ui-line);
		border-radius: calc(var(--ui-radius) * 0.75);
		background: var(--ui-surface);
		transition:
			box-shadow var(--ui-dur) var(--ui-ease-out),
			border-color var(--ui-dur) var(--ui-ease-out);
	}
	@media (hover: hover) {
		.card:hover {
			border-color: transparent;
			box-shadow: var(--ui-shadow-card);
		}
	}
	.media {
		position: relative;
		margin-block-end: 0.25rem;
		overflow: hidden;
		border-radius: calc(var(--ui-radius) * 0.5);
	}
	.out .media {
		opacity: 0.55;
	}
	.flag {
		position: absolute;
		inset-block-start: 0.375rem;
		inset-inline-end: 0.375rem;
		padding: 0.1875rem 0.5rem;
		border-radius: 999px;
		background: var(--danger-600);
		color: var(--on-dark);
		font-size: 0.6875rem;
		font-weight: 700;
		text-transform: uppercase;
	}
	.sold {
		background: var(--badge-out-bg);
		color: var(--badge-out-text);
	}
	.body {
		display: grid;
		align-content: start;
		gap: 0.25rem;
	}
	.save {
		position: absolute;
		inset-block-start: 0.375rem;
		inset-inline-start: 0.375rem;
	}
	.rating {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		margin: 0;
		color: var(--text-secondary);
		font-size: 0.75rem;
		font-variant-numeric: tabular-nums;
	}
	.rating :global(svg) {
		color: var(--star);
	}
	.brand {
		margin: 0;
		color: var(--ui-muted);
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.03em;
	}
	h3 {
		display: -webkit-box;
		margin: 0;
		overflow: hidden;
		font-size: 0.875rem;
		font-weight: 500;
		line-height: 1.4;
		-webkit-box-orient: vertical;
		-webkit-line-clamp: 2;
		line-clamp: 2;
	}
	h3 a {
		color: var(--ui-fg);
		text-decoration: none;
	}
	.card:hover h3 a {
		color: var(--brand-600);
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
