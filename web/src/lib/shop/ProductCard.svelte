<script lang="ts">
	import type { components } from '#lib/api.js';
	import { shop as t } from '#lib/copy.js';
	import Badge from '#lib/sinaui/ui/Badge.svelte';
	import Price from './Price.svelte';
	import ProductImage from './ProductImage.svelte';

	let {
		product: p,
		eager = false
	}: { product: components['schemas']['ProductSummary']; eager?: boolean } = $props();
</script>

<article class="card">
	<a class="media" href="/p/{p.slug}" tabindex="-1" aria-hidden="true">
		<ProductImage src={p.image?.url} alt="" loading={eager ? 'eager' : 'lazy'} />
	</a>
	<div class="tags">
		{#if !p.in_stock}<Badge icon={false}>{t.soldOut}</Badge>
		{:else if p.compare_at_price}<Badge tone="danger" icon={false}>{t.sale}</Badge>{/if}
	</div>
	<h3><a href="/p/{p.slug}">{p.name}</a></h3>
	<Price amount={p.price_min} was={p.compare_at_price} from={p.price_min !== p.price_max} />
</article>

<style>
	.card {
		position: relative;
		display: grid;
		gap: 0.5rem;
		min-inline-size: 0;
	}
	.media {
		display: block;
		overflow: hidden;
		border-radius: calc(var(--ui-radius) * 1.5);
	}
	.media :global(img) {
		transition: scale var(--ui-dur-spring) var(--ui-ease-out);
	}
	@media (hover: hover) and (prefers-reduced-motion: no-preference) {
		.card:hover .media :global(img) {
			scale: 1.04;
		}
	}
	.tags {
		position: absolute;
		inset-block-start: 0.75rem;
		inset-inline-start: 0.75rem;
	}
	h3 {
		margin: 0.25rem 0 0;
		font-size: 0.9375rem;
		font-weight: 500;
		line-height: 1.35;
	}
	h3 a {
		color: var(--ui-fg);
		text-decoration: none;
	}
	h3 a:hover {
		text-decoration: underline;
	}
	h3 a:focus-visible {
		outline: var(--ui-ring-width) solid var(--ui-ring);
		outline-offset: var(--ui-ring-offset);
		border-radius: 2px;
	}
</style>
