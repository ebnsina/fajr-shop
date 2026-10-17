<script lang="ts">
	import { page } from '$app/state';
	import { storefront as sf, shop as t } from '#lib/copy.js';
	import Listing from '#lib/shop/Listing.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const title = $derived(
		data.filters.sale ? sf.onSale : data.filters.featured ? sf.featured : t.all
	);
</script>

<svelte:head>
	<title>{title} · {data.store.name}</title>
	<meta name="description" content="{title} · {data.store.name}" />
	<meta property="og:title" content="{title} · {data.store.name}" />
	<link rel="canonical" href="{page.url.origin}/shop" />
</svelte:head>

<section class="site-container top">
	<nav class="site-crumbs" aria-label="Breadcrumb"><a href="/">{t.home}</a></nav>
	<h1 class="site-title">{title}</h1>
</section>
<section class="site-container">
	<Listing products={data.page} filters={data.filters} paged={data.paged} />
</section>

<style>
	.top {
		display: grid;
		gap: 0.5rem;
		padding-block: 1.5rem;
	}
</style>
