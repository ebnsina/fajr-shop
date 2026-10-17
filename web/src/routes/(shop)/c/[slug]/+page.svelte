<script lang="ts">
	import { page } from '$app/state';
	import { shop as t } from '#lib/copy.js';
	import Listing from '#lib/shop/Listing.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const title = $derived(`${data.category.name} · ${data.store.name}`);
</script>

<svelte:head>
	<title>{title}</title>
	<meta name="description" content={title} />
	<meta property="og:title" content={title} />
	<link rel="canonical" href="{page.url.origin}/c/{data.category.slug}" />
</svelte:head>

<section class="site-container top">
	<nav class="site-crumbs" aria-label="Breadcrumb">
		<a href="/">{t.home}</a> <span aria-hidden="true">/</span>
		{#if data.parentCategory}
			<a href="/c/{data.parentCategory.slug}">{data.parentCategory.name}</a>
			<span aria-hidden="true">/</span>
		{/if}
		<span aria-current="page">{data.category.name}</span>
	</nav>
	<h1 class="site-title">{data.category.name}</h1>
	{#if data.children.length}
		<ul class="subs">
			{#each data.children as c (c.id)}<li><a href="/c/{c.slug}">{c.name}</a></li>{/each}
		</ul>
	{/if}
</section>
<section class="site-container">
	<Listing products={data.page} filters={data.filters} paged={data.paged} />
</section>

<style>
	.top {
		display: grid;
		gap: 0.75rem;
		padding-block: 1.5rem;
	}
	.subs {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.subs a {
		display: inline-block;
		padding: 0.375rem 0.875rem;
		border-radius: 999px;
		background: var(--ui-subtle);
		color: var(--ui-fg);
		font-size: 0.875rem;
		font-weight: 500;
		text-decoration: none;
	}
</style>
