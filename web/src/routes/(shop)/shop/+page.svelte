<script lang="ts">
	import { page } from '$app/state';
	import { shop as t } from '#lib/copy.js';
	import Listing from '#lib/shop/Listing.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head>
	<title>{t.all} · {data.store.name}</title>
	<meta name="description" content="{t.all} · {data.store.name}" />
	<meta property="og:title" content="{t.all} · {data.store.name}" />
	<link rel="canonical" href="{page.url.origin}/shop" />
</svelte:head>

<section class="site-container top">
	<nav class="site-crumbs" aria-label="Breadcrumb"><a href="/">{t.home}</a></nav>
	<h1 class="site-title">{t.all}</h1>
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
