<script lang="ts">
	import Breadcrumb from '#lib/sinaui/ui/Breadcrumb.svelte';
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
	<Breadcrumb
		items={[
			{ label: t.home, href: '/' },
			...(data.parentCategory
				? [{ label: data.parentCategory.name, href: `/c/${data.parentCategory.slug}` }]
				: []),
			{ label: data.category.name }
		]}
	/>
</section>
<section class="site-container">
	<Listing products={data.page} facets={data.facets} filters={data.filters} paged={data.paged}>
		{#snippet heading(count: string | null)}
			<h1 class="site-title">
				{data.category.name}{#if count}<span class="count"> ({count})</span>{/if}
			</h1>
			{#if data.children.length}
				<ul class="subs">
					{#each data.children as c (c.id)}<li><a href="/c/{c.slug}">{c.name}</a></li>{/each}
				</ul>
			{/if}
		{/snippet}
	</Listing>
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
