<script lang="ts">
	import { page } from '$app/state';
	import { storefront as sf, shop as t } from '#lib/copy.js';
	import Button from '#lib/sinaui/ui/Button.svelte';
	import Carousel from '#lib/sinaui/ui/Carousel.svelte';
	import EmptyState from '#lib/sinaui/ui/EmptyState.svelte';
	import Banner from '#lib/shop/Banner.svelte';
	import Section from '#lib/shop/Section.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const topCategories = $derived(data.categories.filter((c) => !c.parent_id));
	const nothing = $derived(!data.newest.length);
</script>

<svelte:head>
	<title>{data.store.name}</title>
	<meta name="description" content={data.store.name} />
	<meta property="og:title" content={data.store.name} />
	<meta property="og:type" content="website" />
	<meta property="og:url" content={page.url.origin} />
	{#if data.hero[0]}<meta property="og:image" content={data.hero[0].image.url} />
	{:else if data.store.logo_url}<meta property="og:image" content={data.store.logo_url} />{/if}
	<link rel="canonical" href={page.url.origin} />
</svelte:head>

<h1 class="sr">{data.store.name}</h1>

<section
	class={['site-container', 'hero', data.side.length && 'with-side']}
	aria-label={sf.featured}
>
	{#if data.hero.length}
		<div class="slides">
			<Carousel label={data.store.name} slides={data.hero} autoplay={6000}>
				{#snippet slide(b, i)}<div class="slide">
						<Banner banner={b} eager={i === 0} />
					</div>{/snippet}
			</Carousel>
		</div>
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

{#if topCategories.length}
	<nav class="site-container circles" aria-label={sf.categories}>
		{#each topCategories as c (c.id)}
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

{#if data.featured.length}
	<Section id="featured" title={sf.featured} href="/shop?featured=1" products={data.featured} />
{/if}

{#if data.wide[0]}
	<div class="site-container wide"><Banner banner={data.wide[0]} /></div>
{/if}

{#if data.onSale.length}
	<Section id="on-sale" title={sf.onSale} href="/shop?sale=1" products={data.onSale} />
{/if}

{#each data.wide.slice(1) as b (b.id)}
	<div class="site-container wide"><Banner banner={b} /></div>
{/each}

{#if nothing}
	<div class="site-container empty">
		<EmptyState title={t.emptyTitle}>{t.emptyBody}</EmptyState>
	</div>
{:else}
	<Section id="newest" title={sf.newArrivals} href="/shop" products={data.newest} />
{/if}

<style>
	.sr {
		position: absolute;
		inline-size: 1px;
		block-size: 1px;
		overflow: hidden;
		clip-path: inset(50%);
	}
	.hero {
		display: grid;
		gap: 1rem;
		margin-block-start: 1rem;
	}
	.hero.with-side {
		grid-template-columns: minmax(0, 3fr) minmax(0, 1fr);
	}
	.slide {
		aspect-ratio: 2 / 1;
	}
	.side {
		display: grid;
		grid-template-rows: 1fr 1fr;
		gap: 1rem;
		min-block-size: 0;
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
	.circles {
		display: flex;
		gap: 1.25rem;
		margin-block-start: 2rem;
		overflow-x: auto;
		scrollbar-width: none;
	}
	.circles a {
		display: grid;
		flex: none;
		justify-items: center;
		gap: 0.5rem;
		inline-size: 6rem;
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
		font-family: var(--font-heading);
		font-size: 1.75rem;
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
		font-size: 0.8125rem;
		font-weight: 600;
		text-align: center;
		text-transform: uppercase;
		letter-spacing: 0.02em;
	}
	.wide {
		margin-block-start: 2.5rem;
	}
	.wide :global(.banner) {
		aspect-ratio: 5 / 1;
	}
	.empty {
		margin-block-start: 2.5rem;
	}
	@media (width < 48rem) {
		.hero.with-side {
			grid-template-columns: minmax(0, 1fr);
		}
		.side {
			grid-template-rows: none;
			grid-template-columns: 1fr 1fr;
		}
		.side :global(.banner) {
			aspect-ratio: 2 / 1;
		}
		.circles {
			gap: 0.75rem;
		}
		.circles a {
			inline-size: 4.5rem;
		}
		.circle {
			inline-size: 4rem;
			block-size: 4rem;
			font-size: 1.25rem;
		}
		.wide :global(.banner) {
			aspect-ratio: 3 / 1;
		}
	}
</style>
