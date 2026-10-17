<script lang="ts">
	import type { components } from '#lib/api.js';
	import { home as t } from '#lib/copy.js';
	import ProductImage from './ProductImage.svelte';

	let { brands }: { brands: components['schemas']['Brand'][] } = $props();
</script>

<section class="site-container brands" aria-labelledby="brands">
	<h2 class="site-title" id="brands">{t.brands}</h2>
	<ul>
		{#each brands as b (b.name)}
			<li>
				<a href="/shop?brand={encodeURIComponent(b.name)}">
					<span class="pic"><ProductImage src={b.image?.url} alt="" ratio="1" icon={18} /></span>
					<span class="name">{b.name}</span>
					<span class="count">{t.products(b.product_count)}</span>
				</a>
			</li>
		{/each}
	</ul>
</section>

<style>
	.brands {
		display: grid;
		gap: 1rem;
		margin-block-start: 2.5rem;
	}
	ul {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(min(13rem, 100%), 1fr));
		gap: 0.75rem;
		margin: 0;
		padding: 0;
		list-style: none;
	}
	a {
		display: grid;
		grid-template-columns: 3.5rem 1fr;
		grid-template-rows: auto auto;
		column-gap: 0.75rem;
		align-items: center;
		padding: 0.625rem;
		border: 1px solid var(--ui-line);
		border-radius: calc(var(--ui-radius) * 0.75);
		background: var(--ui-surface);
		color: var(--ui-fg);
		text-decoration: none;
	}
	a:hover {
		border-color: var(--ui-accent);
	}
	.pic {
		grid-row: span 2;
		overflow: hidden;
		border-radius: calc(var(--ui-radius) * 0.5);
	}
	.name {
		align-self: end;
		font-weight: 600;
	}
	.count {
		align-self: start;
		color: var(--ui-muted);
		font-size: 0.8125rem;
	}
</style>
