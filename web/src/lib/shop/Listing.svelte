<script lang="ts">
	import { page } from '$app/state';
	import type { components } from '#lib/api.js';
	import { shop as t } from '#lib/copy.js';
	import type { Filters } from '#lib/server/listing.js';
	import Button from '#lib/sinaui/ui/Button.svelte';
	import Checkbox from '#lib/sinaui/ui/Checkbox.svelte';
	import EmptyState from '#lib/sinaui/ui/EmptyState.svelte';
	import Input from '#lib/sinaui/ui/Input.svelte';
	import Select from '#lib/sinaui/ui/Select.svelte';
	import ProductCard from './ProductCard.svelte';

	// A filterable, sortable product grid. The filters are a plain GET form: they work without
	// JavaScript, and every filtered page has its own shareable, crawlable address.
	let {
		products,
		filters,
		paged
	}: { products: components['schemas']['ProductPage']; filters: Filters; paged: boolean } =
		$props();

	const filtered = $derived(!!(filters.min || filters.max || filters.stock));
	const withCursor = (cursor: string) => {
		const q = new URLSearchParams(page.url.searchParams.toString());
		q.set('cursor', cursor);
		return `?${q}`;
	};
	const first = $derived.by(() => {
		const q = new URLSearchParams(page.url.searchParams.toString());
		q.delete('cursor');
		const s = q.toString();
		return s ? `?${s}` : page.url.pathname;
	});
	const cleared = $derived(filters.q ? `?q=${encodeURIComponent(filters.q)}` : page.url.pathname);
</script>

<form method="get" class="filters" aria-label={t.filters}>
	{#if filters.q}<input type="hidden" name="q" value={filters.q} />{/if}
	{#if filters.sale}<input type="hidden" name="sale" value="1" />{/if}
	{#if filters.featured}<input type="hidden" name="featured" value="1" />{/if}
	<Input
		label={t.minPrice}
		name="min"
		type="number"
		inputmode="numeric"
		min="0"
		value={filters.min}
	/>
	<Input
		label={t.maxPrice}
		name="max"
		type="number"
		inputmode="numeric"
		min="0"
		value={filters.max}
	/>
	<div class="check">
		<Checkbox name="stock" value="1" checked={filters.stock}>{t.inStockOnly}</Checkbox>
	</div>
	<Select
		label={t.sort}
		name="sort"
		value={filters.sort}
		onchange={(e: Event) => (e.currentTarget as HTMLSelectElement).form?.requestSubmit()}
	>
		{#each Object.entries(t.sorts) as [value, label] (value)}<option {value}>{label}</option>{/each}
	</Select>
	<div class="apply"><Button type="submit" variant="secondary">{t.apply}</Button></div>
</form>

{#if products.items.length}
	<ul class="site-grid">
		{#each products.items as p, i (p.id)}<li>
				<ProductCard product={p} eager={!paged && i < 4} />
			</li>{/each}
	</ul>
{:else if filtered}
	<EmptyState title={t.noMatchTitle}>
		{t.noMatchBody}
		{#snippet actions()}<Button variant="secondary" href={cleared}>{t.clear}</Button>{/snippet}
	</EmptyState>
{:else}
	<EmptyState title={t.emptyTitle}>{t.emptyBody}</EmptyState>
{/if}

{#if paged || products.next_cursor}
	<nav class="pages" aria-label={t.next}>
		{#if paged}<Button variant="ghost" href={first}>{t.first}</Button>{/if}
		{#if products.next_cursor}
			<Button variant="secondary" href={withCursor(products.next_cursor)}>{t.next}</Button>
		{/if}
	</nav>
{/if}

<style>
	.filters {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(min(9rem, 100%), 1fr));
		align-items: end;
		gap: 0.75rem;
		margin-block-end: 2rem;
		padding: 1rem;
		border-radius: calc(var(--ui-radius) * 1.5);
		background: var(--ui-subtle);
	}
	.check {
		padding-block-end: 0.5rem;
	}
	.pages {
		display: flex;
		justify-content: center;
		gap: 0.5rem;
		margin-block-start: 2.5rem;
	}
</style>
