<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { productStatus, products as t } from '#lib/copy.js';
	import { formatRange } from '#lib/money.js';
	import Badge from '#lib/sinaui/ui/Badge.svelte';
	import Button from '#lib/sinaui/ui/Button.svelte';
	import EmptyState from '#lib/sinaui/ui/EmptyState.svelte';
	import SearchField from '#lib/sinaui/ui/SearchField.svelte';
	import Segmented from '#lib/sinaui/ui/Segmented.svelte';
	import Table from '#lib/sinaui/ui/Table.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const filters = [
		{ value: '', label: t.all },
		{ value: 'active', label: productStatus.active },
		{ value: 'draft', label: productStatus.draft },
		{ value: 'archived', label: productStatus.archived }
	];
	let status = $derived(data.status);

	/** Same page with these query values; empty ones dropped, paging reset. */
	function withQuery(changes: Record<string, string>) {
		const params = new URLSearchParams(page.url.searchParams.toString());
		params.delete('cursor');
		for (const [k, v] of Object.entries(changes)) {
			if (v) params.set(k, v);
			else params.delete(k);
		}
		const qs = params.toString();
		return qs ? `?${qs}` : page.url.pathname;
	}
	const filtering = $derived(!!data.q || !!data.status);
</script>

<svelte:head><title>{t.title} · {data.store.name}</title></svelte:head>

<div class="head">
	<div>
		<h1>{t.title}</h1>
		<p>{t.description}</p>
	</div>
	<Button href="/admin/products/new">{t.add}</Button>
</div>

<div class="tools">
	<SearchField
		label={t.search}
		hideLabel
		placeholder={t.search}
		value={data.q}
		onsearch={(q) => goto(withQuery({ q }))}
	/>
	<Segmented
		label={t.filter}
		hideLabel
		options={filters}
		bind:value={() => status, (v) => goto(withQuery({ status: v ?? '' }))}
	/>
</div>

{#if data.page.items.length}
	<Table caption={t.caption} hideCaption>
		<thead>
			<tr>
				<th>{t.columns.product}</th>
				<th>{t.columns.status}</th>
				<th class="num">{t.columns.price}</th>
				<th>{t.columns.stock}</th>
			</tr>
		</thead>
		<tbody>
			{#each data.page.items as p (p.id)}
				<tr>
					<td>
						<a class="product" href="/admin/products/{p.id}">
							{#if p.image}
								<img src={p.image.url} alt="" width="40" height="40" loading="lazy" />
							{:else}
								<span class="thumb" aria-hidden="true"></span>
							{/if}
							<span>{p.name}</span>
						</a>
					</td>
					<td>
						<Badge tone={p.status === 'active' ? 'accent' : 'neutral'} icon={false}>
							{productStatus[p.status]}
						</Badge>
					</td>
					<td class="num">{formatRange(p.price_min, p.price_max)}</td>
					<td>
						<Badge tone={p.in_stock ? 'neutral' : 'warning'} icon={!p.in_stock}>
							{p.in_stock ? t.inStock : t.outOfStock}
						</Badge>
					</td>
				</tr>
			{/each}
		</tbody>
	</Table>
{:else if filtering}
	<EmptyState title={t.noMatchTitle}>
		{t.noMatchBody}
		{#snippet actions()}<Button variant="secondary" href="/admin/products">{t.all}</Button
			>{/snippet}
	</EmptyState>
{:else}
	<EmptyState title={t.emptyTitle}>
		{t.emptyBody}
		{#snippet actions()}<Button href="/admin/products/new">{t.add}</Button>{/snippet}
	</EmptyState>
{/if}

<nav class="pages" aria-label={t.caption}>
	{#if data.paged}<Button href={withQuery({})} variant="ghost">{t.first}</Button>{/if}
	{#if data.page.next_cursor}
		<Button href={withQuery({ cursor: data.page.next_cursor })} variant="secondary">{t.next}</Button
		>
	{/if}
</nav>

<style>
	.head {
		display: flex;
		flex-wrap: wrap;
		align-items: start;
		justify-content: space-between;
		gap: 1rem;
		margin-block-end: 1.5rem;
	}
	h1 {
		margin: 0 0 0.25rem;
		font-size: 1.5rem;
	}
	.head p {
		margin: 0;
		color: var(--ui-muted);
	}
	.tools {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
		margin-block-end: 1rem;
	}
	.tools > :global(:first-child) {
		flex: 1 1 14rem;
	}
	.product {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		color: inherit;
		font-weight: 500;
		text-decoration: none;
	}
	.product:hover span {
		text-decoration: underline;
	}
	img,
	.thumb {
		flex: none;
		inline-size: 2.5rem;
		block-size: 2.5rem;
		border-radius: calc(var(--ui-radius) / 2);
		background: var(--ui-subtle);
		object-fit: cover;
	}
	.pages {
		display: flex;
		justify-content: end;
		gap: 0.5rem;
		margin-block-start: 1rem;
	}
</style>
