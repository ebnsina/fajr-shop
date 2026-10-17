<script lang="ts">
	import { page } from '$app/state';
	import { home as h, storefront as sf, shop as t } from '#lib/copy.js';
	import Button from '#lib/sinaui/ui/Button.svelte';
	import EmptyState from '#lib/sinaui/ui/EmptyState.svelte';
	import * as Tabs from '#lib/sinaui/ui/tabs/index.js';
	import Banner from '#lib/shop/Banner.svelte';
	import Brands from '#lib/shop/Brands.svelte';
	import HeroSlider from '#lib/shop/HeroSlider.svelte';
	import Highlights from '#lib/shop/Highlights.svelte';
	import ProductCard from '#lib/shop/ProductCard.svelte';
	import ProductRow from '#lib/shop/ProductRow.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const top = $derived(data.categories.filter((c) => !c.parent_id));
	const tabs = $derived(
		[
			{ value: 'newest', label: h.tabs.newest, items: data.newest, href: '/shop' },
			{ value: 'sale', label: h.tabs.sale, items: data.onSale, href: '/shop?sale=1' },
			{ value: 'featured', label: h.tabs.featured, items: data.featured, href: '/shop?featured=1' }
		].filter((x) => x.items.length)
	);
	let tab = $state('newest');
</script>

<svelte:head>
	<title>{data.store.name}</title>
	<meta name="description" content={data.store.name} />
	<meta property="og:title" content={data.store.name} />
	<meta property="og:type" content="website" />
	<meta property="og:url" content={page.url.origin} />
	{#if data.hero[0]}<meta property="og:image" content={data.hero[0].image.url} />{/if}
	<link rel="canonical" href={page.url.origin} />
</svelte:head>

<h1 class="sr">{data.store.name}</h1>

{#if top.length}
	<nav class="site-container circles" aria-label={sf.categories}>
		{#each top as c (c.id)}
			<a href="/c/{c.slug}">
				<span class="circle">
					{#if c.image}<img src={c.image.url} alt="" loading="lazy" />{:else}{c.name.slice(
							0,
							1
						)}{/if}
				</span>
				<span class="name">{c.name}</span>
			</a>
		{/each}
	</nav>
{/if}

<section
	class={['site-container', 'hero', data.side.length && 'with-side']}
	aria-label={sf.featured}
>
	{#if data.hero.length}
		<HeroSlider slides={data.hero} label={data.store.name} />
	{:else}
		<div class="plain">
			<p class="site-display">{data.store.name}</p>
			<div><Button href="/shop" size="lg">{t.all}</Button></div>
		</div>
	{/if}
	{#if data.side.length}
		<div class="side">
			{#each data.side as b (b.id)}<Banner banner={b} eager />{/each}
		</div>
	{/if}
</section>

{#if data.store.highlights?.length}<Highlights items={data.store.highlights} />{/if}

{#if data.featured.length}
	<ProductRow id="featured" title={sf.featured} href="/shop?featured=1" products={data.featured} />
{/if}

{#if data.wide[0]}<div class="site-container wide"><Banner banner={data.wide[0]} /></div>{/if}

{#if data.onSale.length}
	<ProductRow id="on-sale" title={sf.onSale} href="/shop?sale=1" products={data.onSale} />
{/if}

{#each data.departments as d (d.category.id)}
	<ProductRow
		id="dept-{d.category.slug}"
		title={d.category.name}
		href="/c/{d.category.slug}"
		products={d.products}
	/>
{/each}

{#each data.wide.slice(1) as b (b.id)}<div class="site-container wide">
		<Banner banner={b} />
	</div>{/each}

{#if tabs.length}
	<section class="site-container recommended" aria-labelledby="recommended">
		<h2 class="site-title" id="recommended">{h.recommended}</h2>
		<Tabs.Root bind:value={tab}>
			<Tabs.List label={h.recommended}>
				{#each tabs as x (x.value)}<Tabs.Tab value={x.value}>{x.label}</Tabs.Tab>{/each}
			</Tabs.List>
			{#each tabs as x (x.value)}
				<Tabs.Panel value={x.value}>
					<ul class="site-grid">
						{#each x.items as p (p.id)}<li><ProductCard product={p} /></li>{/each}
					</ul>
					<div class="all"><Button variant="secondary" href={x.href}>{sf.more}</Button></div>
				</Tabs.Panel>
			{/each}
		</Tabs.Root>
	</section>
{:else}
	<div class="site-container empty">
		<EmptyState title={t.emptyTitle}>{t.emptyBody}</EmptyState>
	</div>
{/if}

{#if data.brands.length}<Brands brands={data.brands} />{/if}

<style>
	.sr {
		position: absolute;
		inline-size: 1px;
		block-size: 1px;
		overflow: hidden;
		clip-path: inset(50%);
	}
	.circles {
		display: flex;
		justify-content: space-between;
		gap: 1rem;
		padding-block: 1.25rem 0.5rem;
		overflow-x: auto;
		scrollbar-width: none;
	}
	.circles a {
		display: grid;
		flex: none;
		justify-items: center;
		gap: 0.5rem;
		inline-size: 6.25rem;
		color: var(--ui-fg);
		text-decoration: none;
	}
	.circle {
		display: grid;
		place-items: center;
		inline-size: 5.5rem;
		block-size: 5.5rem;
		overflow: hidden;
		border-radius: 50%;
		background: color-mix(in srgb, var(--ui-accent) 14%, var(--ui-surface));
		color: var(--ui-accent);
		font-size: 1.5rem;
		font-weight: 700;
		transition: scale var(--ui-dur) var(--ui-ease-out);
	}
	.circle img {
		inline-size: 100%;
		block-size: 100%;
		object-fit: cover;
	}
	@media (hover: hover) {
		.circles a:hover .circle {
			scale: 1.05;
		}
	}
	.name {
		font-size: 0.75rem;
		font-weight: 600;
		line-height: 1.25;
		text-align: center;
		text-transform: uppercase;
	}
	.hero {
		display: grid;
		gap: 1rem;
		margin-block-start: 1rem;
	}
	.hero.with-side {
		grid-template-columns: minmax(0, 3fr) minmax(0, 1fr);
	}
	.side {
		display: grid;
		grid-template-rows: 1fr 1fr;
		gap: 1rem;
		/* The slider sets the row's height; the side banners share it instead of stretching it. */
		contain: size;
	}
	.plain {
		display: grid;
		align-content: center;
		gap: 1.5rem;
		min-block-size: clamp(14rem, 30vw, 22rem);
		padding: 2rem;
		box-sizing: border-box;
		border-radius: var(--ui-radius);
		background: color-mix(in srgb, var(--ui-accent) 12%, var(--ui-surface));
	}
	.wide {
		margin-block-start: 2.5rem;
	}
	.wide :global(.banner) {
		aspect-ratio: 5 / 1;
	}
	.recommended {
		display: grid;
		justify-items: center;
		gap: 1rem;
		margin-block-start: 3rem;
	}
	.recommended :global(> div) {
		inline-size: 100%;
	}
	.recommended :global([role='tablist']) {
		justify-content: center;
	}
	.recommended .site-grid {
		margin-block-start: 1rem;
	}
	.all {
		display: flex;
		justify-content: center;
		margin-block-start: 1.25rem;
	}
	.empty {
		margin-block-start: 2.5rem;
	}
	@media (width < 48rem) {
		.circles {
			justify-content: start;
			gap: 0.5rem;
		}
		.circles a {
			inline-size: 4.75rem;
		}
		.circle {
			inline-size: 4rem;
			block-size: 4rem;
		}
		.hero.with-side {
			grid-template-columns: minmax(0, 1fr);
		}
		.side {
			contain: none;
			grid-template-rows: none;
			grid-template-columns: 1fr 1fr;
		}
		.side :global(.banner) {
			aspect-ratio: 2 / 1;
		}
		.wide :global(.banner) {
			aspect-ratio: 3 / 1;
		}
	}
</style>
