<script lang="ts">
	import type { ProductCard } from '@fajr/core/catalog';
	import { formatMoney } from '$lib/money';

	// Both required: a default here printed dirhams in Bengali numerals.
	let { items, currency, locale }: {
		items: ProductCard[];
		currency: string;
		locale: string;
	} = $props();
</script>

<ul class="grid">
	{#each items as item (item.id)}
		<li>
			<a href="/products/{item.slug}">
				<div class="frame">
					{#if item.imageUrl}
						<!-- The CDN resizes; the app never touches pixels. -->
						<img src={item.imageUrl} alt={item.imageAlt ?? item.title} loading="lazy" />
					{:else}
						<div class="placeholder" aria-hidden="true"></div>
					{/if}
					{#if !item.inStock}<span class="badge">Sold out</span>{/if}
				</div>

				<h3>{item.title}</h3>
				<p class="price">
					{formatMoney(item.priceMinor, currency, locale)}
					{#if item.compareAtMinor}
						<s>{formatMoney(item.compareAtMinor, currency, locale)}</s>
					{/if}
				</p>
			</a>
		</li>
	{/each}
</ul>

<style>
	.grid {
		display: grid;
		grid-template-columns: repeat(var(--cols-base), minmax(0, 1fr));
		gap: var(--grid-gap);
		list-style: none;
		margin: 0;
		padding: 0;
	}

	@media (min-width: 40rem) {
		.grid {
			grid-template-columns: repeat(var(--cols-sm), minmax(0, 1fr));
		}
	}
	@media (min-width: 64rem) {
		.grid {
			grid-template-columns: repeat(var(--cols-lg), minmax(0, 1fr));
		}
	}

	a {
		text-decoration: none;
		color: inherit;
		display: block;
	}

	.frame {
		position: relative;
		aspect-ratio: var(--card-aspect);
		background: var(--c-surface);
		border-radius: var(--radius);
		overflow: hidden;
	}

	img,
	.placeholder {
		inline-size: 100%;
		block-size: 100%;
		object-fit: cover;
		display: block;
	}

	.placeholder {
		background: var(--c-line);
	}

	.badge {
		position: absolute;
		inset-block-start: 0.5rem;
		inset-inline-start: 0.5rem;
		background: var(--c-text);
		color: var(--c-bg);
		font-size: 0.75rem;
		padding: 0.125rem 0.5rem;
		border-radius: var(--radius);
	}

	h3 {
		font-family: var(--font-display);
		font-size: var(--card-title, 1rem);
		font-weight: 400;
		margin: var(--card-pad, 0.75rem) 0 0.25rem;
	}

	.price {
		margin: 0;
		font-size: 0.9375rem;
		font-variant-numeric: tabular-nums;
	}

	s {
		color: var(--c-muted);
		margin-inline-start: 0.5rem;
	}
</style>
