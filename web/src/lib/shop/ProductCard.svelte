<script lang="ts">
	import { ShoppingBag02Icon, StarIcon } from '@hugeicons/core-free-icons';
	import Icon from '#lib/sinaui/ui/Icon.svelte';
	import type { components } from '#lib/api.js';
	import { cart as c, ratings as r, storefront as sf, shop as t } from '#lib/copy.js';
	import { formatMoney } from '#lib/money.js';
	import SaveButton from './SaveButton.svelte';
	import ProductImage from './ProductImage.svelte';

	let {
		product: p,
		eager = false
	}: { product: components['schemas']['ProductSummary']; eager?: boolean } = $props();

	const one = new Intl.NumberFormat('en-BD', {
		minimumFractionDigits: 1,
		maximumFractionDigits: 1
	});
	// The saving on the cheapest variant, as shoppers here expect to see it: "−20%".
	const off = $derived(
		p.compare_at_price ? Math.round((1 - p.price_min / p.compare_at_price) * 100) : 0
	);
</script>

<article class={['card', !p.in_stock && 'out']}>
	<div class="media">
		<ProductImage src={p.image?.url} alt="" ratio="1" loading={eager ? 'eager' : 'lazy'} />
		<div class="tags">
			{#if !p.in_stock}<span class="tag light">{t.soldOut}</span>
			{:else if off > 0}<span class="tag dark">{sf.off(off)}</span>{/if}
		</div>
		{#if p.rating_count && p.rating_average}
			<p class="chip" aria-label={r.stars(one.format(p.rating_average), p.rating_count)}>
				<Icon icon={StarIcon} size={16} fill="currentColor" class="star" />
				<span aria-hidden="true">{one.format(p.rating_average)}</span>
			</p>
		{/if}
		<!-- Sits in a corner cut out of the picture; its concave edges are drawn by ::before/::after. -->
		<div class="actions">
			<SaveButton id={p.id} name={p.name} tile />
			{#if p.in_stock && p.single_variant_id}
				<button
					type="submit"
					form="bag-form"
					name="variant"
					value={p.single_variant_id}
					class="tile"
					aria-label={c.addNamed(p.name)}
				>
					<Icon icon={ShoppingBag02Icon} size={20} />
				</button>
			{:else}
				<a class="tile" href="/p/{p.slug}" aria-label={c.choose(p.name)} tabindex="-1">
					<Icon icon={ShoppingBag02Icon} size={20} />
				</a>
			{/if}
		</div>
	</div>
	<div class="meta">
		<p class="brand">{p.brand ?? ''}</p>
		{#if p.compare_at_price}<s>{formatMoney(p.compare_at_price)}</s>{/if}
		<h3><a href="/p/{p.slug}">{p.name}</a></h3>
		<p class="price">
			{#if p.price_min !== p.price_max}<span class="from">{t.from}</span>{/if}
			{formatMoney(p.price_min)}
		</p>
	</div>
</article>

<style>
	.card {
		--r: 1.125rem;
		position: relative;
		display: grid;
		grid-template-rows: auto 1fr;
		gap: 0.625rem;
		block-size: 100%;
		box-sizing: border-box;
		min-inline-size: 0;
		padding: 0.5rem 0.5rem 0.875rem;
		border: 1px solid var(--border);
		border-radius: calc(var(--r) + 0.5rem);
		background: var(--bg-surface);
		transition: box-shadow var(--ui-dur) var(--ui-ease-out);
	}
	@media (hover: hover) {
		.card:hover {
			box-shadow: var(--ui-shadow-card);
		}
	}
	.media {
		position: relative;
		overflow: hidden;
		border-radius: var(--r);
		background: var(--bg-subtle);
	}
	.media :global(.image),
	.media :global(img) {
		border-radius: 0;
	}
	.out .media :global(img) {
		opacity: 0.55;
	}
	.tags {
		position: absolute;
		inset-block-start: 0.5rem;
		inset-inline-start: 0.5rem;
		display: flex;
		gap: 0.375rem;
	}
	.tag {
		padding: 0.3125rem 0.625rem;
		border-radius: 0.75rem;
		font-size: 0.8125rem;
		font-weight: 600;
		line-height: 1.2;
	}
	.dark {
		background: var(--text-primary);
		color: var(--on-dark);
	}
	.light {
		background: var(--bg-surface);
		color: var(--text-primary);
	}
	.chip {
		position: absolute;
		inset-block-end: 0.5rem;
		inset-inline-start: 0.5rem;
		display: grid;
		justify-items: center;
		gap: 0.125rem;
		margin: 0;
		padding: 0.375rem 0.625rem;
		border-radius: 0.875rem;
		background: color-mix(in srgb, var(--bg-surface) 88%, transparent);
		color: var(--text-primary);
		font-size: 0.875rem;
		font-weight: 600;
		font-variant-numeric: tabular-nums;
	}
	.chip :global(.star) {
		color: var(--star);
	}
	.actions {
		position: absolute;
		inset-block-end: 0;
		inset-inline-end: 0;
		z-index: 2;
		display: flex;
		gap: 0.375rem;
		padding: 0.375rem 0 0 0.375rem;
		border-start-start-radius: var(--r);
		background: var(--bg-surface);
	}
	/* The two concave corners where the cut-out meets the picture. */
	.actions::before,
	.actions::after {
		content: '';
		position: absolute;
		inline-size: var(--r);
		block-size: var(--r);
		background: radial-gradient(
			circle at 0 0,
			transparent calc(var(--r) - 0.5px),
			var(--bg-surface) var(--r)
		);
		pointer-events: none;
	}
	.actions::before {
		inset-block-end: 100%;
		inset-inline-end: 0;
	}
	.actions::after {
		inset-block-end: 0;
		inset-inline-end: 100%;
	}
	.tile {
		position: relative;
		display: grid;
		place-items: center;
		inline-size: 2.75rem;
		block-size: 2.75rem;
		padding: 0;
		border: 0;
		border-radius: 0.875rem;
		background: var(--bg-subtle);
		color: var(--text-primary);
		cursor: pointer;
	}
	.tile:hover {
		background: var(--brand-50);
		color: var(--brand-700);
	}
	.tile:focus-visible {
		outline: var(--ui-ring-width) solid var(--ui-ring);
		outline-offset: var(--ui-ring-offset);
	}
	/* Brand, then the name across the card, then the price with the old one beside it. */
	.meta {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		grid-template-areas: 'brand brand' 'name name' 'price was';
		grid-template-rows: auto 1fr auto;
		align-items: baseline;
		gap: 0.125rem 0.75rem;
		padding-inline: 0.375rem;
	}
	.brand {
		grid-area: brand;
		min-block-size: 1lh;
		margin: 0;
		color: var(--text-secondary);
		font-size: 0.75rem;
		letter-spacing: 0.03em;
		text-transform: uppercase;
	}
	s {
		grid-area: was;
		color: var(--text-muted);
		font-size: 0.8125rem;
		font-variant-numeric: tabular-nums;
	}
	h3 {
		grid-area: name;
		align-self: start;
		display: -webkit-box;
		margin: 0;
		overflow: hidden;
		font-size: 0.9375rem;
		font-weight: 600;
		line-height: 1.35;
		-webkit-box-orient: vertical;
		-webkit-line-clamp: 2;
		line-clamp: 2;
	}
	h3 a {
		color: var(--text-primary);
		text-decoration: none;
	}
	/* The whole card is the link's target, so it's easy to tap on a phone. */
	h3 a::after {
		content: '';
		position: absolute;
		inset: 0;
		z-index: 1;
		border-radius: inherit;
	}
	h3 a:focus-visible {
		outline: none;
	}
	.card:has(h3 a:focus-visible) {
		outline: var(--ui-ring-width) solid var(--ui-ring);
		outline-offset: var(--ui-ring-offset);
	}
	.price {
		grid-area: price;
		margin: 0.25rem 0 0;
		font-size: 1.0625rem;
		font-weight: 700;
		white-space: nowrap;
		font-variant-numeric: tabular-nums;
	}
	.from {
		margin-inline-end: 0.25rem;
		color: var(--text-secondary);
		font-size: 0.75rem;
		font-weight: 500;
	}
	@media (width < 40rem) {
		.tile {
			inline-size: 2.375rem;
			block-size: 2.375rem;
		}
		.meta {
			grid-template-areas: 'brand brand' 'name name' 'price price' 'was was';
		}
	}
</style>
