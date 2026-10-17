<script lang="ts">
	import { Cancel01Icon, FilterHorizontalIcon } from '@hugeicons/core-free-icons';
	import Icon from '#lib/sinaui/ui/Icon.svelte';
	import { onMount, tick, type Snippet } from 'svelte';
	import { page } from '$app/state';
	import type { components } from '#lib/api.js';
	import { shop as t } from '#lib/copy.js';
	import { formatMoney } from '#lib/money.js';
	import type { Facets, Filters } from '#lib/server/listing.js';
	import * as Accordion from '#lib/sinaui/ui/accordion/index.js';
	import Button from '#lib/sinaui/ui/Button.svelte';
	import Checkbox from '#lib/sinaui/ui/Checkbox.svelte';
	import EmptyState from '#lib/sinaui/ui/EmptyState.svelte';
	import Input from '#lib/sinaui/ui/Input.svelte';
	import CustomSelect from '#lib/sinaui/ui/CustomSelect.svelte';
	import ProductCard from './ProductCard.svelte';

	// The page's heading with the sort at its right, filters in a side card. It's one plain GET
	// form, so a filtered list works without JavaScript and every filtered page has its own address.
	let {
		products,
		facets,
		filters,
		paged,
		heading
	}: {
		products: components['schemas']['ProductPage'];
		facets: Facets | null;
		filters: Filters;
		paged: boolean;
		/** The page's title; gets how many products match, formatted, or null if unknown. */
		heading: Snippet<[string | null]>;
	} = $props();

	// Open beside the results; folded under a "Filters" button on phones, where it would push them down.
	let filtersOpen = $state(true);
	onMount(() => {
		if (matchMedia('(width < 56rem)').matches) filtersOpen = false;
	});

	type Choice = { value: string; label: string; count: number; on: boolean };
	const SHOWN = 8;
	const num = new Intl.NumberFormat('en-BD');
	const taka = (v: string) => formatMoney(Math.round(Number(v) * 100));

	/** The current address with some params changed; any change starts the list from the top. */
	const href = (edit: (q: URLSearchParams) => void) => {
		const q = new URLSearchParams(page.url.search);
		q.delete('cursor');
		edit(q);
		const s = q.toString();
		return s ? `?${s}` : page.url.pathname;
	};
	const withCursor = (cursor: string) => href((q) => q.set('cursor', cursor));
	const first = $derived(href(() => {}));
	const cleared = $derived(filters.q ? `?q=${encodeURIComponent(filters.q)}` : page.url.pathname);

	// A category page links to its subcategories; the shop and search narrow in place.
	const onCategoryPage = $derived(page.url.pathname.startsWith('/c/'));
	const categoryHref = (slug: string) =>
		onCategoryPage ? `/c/${slug}` : href((q) => q.set('category', slug));

	const chips = $derived.by(() => {
		const out: { label: string; href: string }[] = [];
		const drop = (key: string, value?: string) => href((q) => q.delete(key, value));
		if (filters.category) {
			const c = facets?.categories.find((c) => c.slug === filters.category);
			out.push({ label: c?.name ?? filters.category, href: drop('category') });
		}
		for (const b of filters.brands) out.push({ label: b, href: drop('brand', b) });
		for (const o of filters.options)
			out.push({ label: o.replace(':', ': '), href: drop('option', o) });
		if (filters.min) out.push({ label: t.from_(taka(filters.min)), href: drop('min') });
		if (filters.max) out.push({ label: t.upTo(taka(filters.max)), href: drop('max') });
		if (filters.stock) out.push({ label: t.inStockOnly, href: drop('stock') });
		if (filters.sale) out.push({ label: t.onSaleOnly, href: drop('sale') });
		return out;
	});
	const filtered = $derived(chips.length > 0);

	let form = $state<HTMLFormElement>();
	const submit = (e: Event) => (e.currentTarget as HTMLElement).closest('form')?.requestSubmit();
	// Ticking a box applies it straight away; prices wait for Apply so typing isn't interrupted.
	const onchange = (e: Event) => {
		if ((e.target as HTMLInputElement).type === 'checkbox') submit(e);
	};
</script>

{#snippet cats(list: Facets['categories'])}
	<ul class="cats">
		{#each list as c (c.slug)}
			<li>
				<a href={categoryHref(c.slug)} aria-current={c.slug === filters.category || undefined}
					>{c.name}<span class="n">{num.format(c.count)}</span></a
				>
			</li>
		{/each}
	</ul>
{/snippet}

{#snippet boxes(name: string, items: Choice[])}
	<div class="list">
		{#each items as c (c.value)}
			<Checkbox {name} value={c.value} checked={c.on}>
				{c.label} <span class="n">{num.format(c.count)}</span>
			</Checkbox>
		{/each}
	</div>
{/snippet}

{#snippet choices(name: string, items: Choice[])}
	{@render boxes(name, items.slice(0, SHOWN))}
	{#if items.length > SHOWN}
		{@const rest = items.slice(SHOWN)}
		<Accordion.Item title={t.more(rest.length)} open={rest.some((c) => c.on)}>
			{@render boxes(name, rest)}
		</Accordion.Item>
	{/if}
{/snippet}

<form method="get" class="listing" {onchange} bind:this={form}>
	<div class="pagehead">
		<div class="title">{@render heading(facets ? num.format(facets.total) : null)}</div>
		<div class="sort">
			<CustomSelect
				label={t.sort}
				hideLabel
				name="sort"
				value={filters.sort}
				options={Object.entries(t.sorts).map(([value, label]) => ({ value, label }))}
				onchange={() => tick().then(() => form?.requestSubmit())}
			/>
		</div>
	</div>

	{#if filters.q}<input type="hidden" name="q" value={filters.q} />{/if}
	{#if filters.category}<input type="hidden" name="category" value={filters.category} />{/if}
	{#if filters.featured}<input type="hidden" name="featured" value="1" />{/if}

	<details class="filters" bind:open={filtersOpen}>
		<summary class="toggle"><Icon icon={FilterHorizontalIcon} size={16} /> {t.filters}</summary>
		<div class="card">
			<Accordion.Root>
				{#if facets && facets.categories.length > 1}
					<Accordion.Item title={t.category} open>
						{@render cats(facets.categories.slice(0, SHOWN))}
						{#if facets.categories.length > SHOWN}
							{@const rest = facets.categories.slice(SHOWN)}
							<Accordion.Item
								class="more"
								title={t.more(rest.length)}
								open={rest.some((c) => c.slug === filters.category)}
							>
								{@render cats(rest)}
							</Accordion.Item>
						{/if}
					</Accordion.Item>
				{/if}

				<Accordion.Item title={t.priceRange} open>
					<div class="pane">
						<div class="range">
							<Input
								label={t.minPrice}
								hideLabel
								name="min"
								type="number"
								inputmode="numeric"
								min="0"
								value={filters.min}
								placeholder={facets?.price ? formatMoney(facets.price.min) : t.minPlaceholder}
							/>
							<span aria-hidden="true">–</span>
							<Input
								label={t.maxPrice}
								hideLabel
								name="max"
								type="number"
								inputmode="numeric"
								min="0"
								value={filters.max}
								placeholder={facets?.price ? formatMoney(facets.price.max) : t.maxPlaceholder}
							/>
						</div>
						<div><Button type="submit" variant="secondary" size="sm">{t.apply}</Button></div>
					</div>
				</Accordion.Item>

				{#if facets?.brands.length}
					<Accordion.Item title={t.brand} open>
						{@render choices(
							'brand',
							facets.brands.map((b) => ({
								value: b.name,
								label: b.name,
								count: b.count,
								on: filters.brands.includes(b.name)
							}))
						)}
					</Accordion.Item>
				{/if}

				{#each facets?.options ?? [] as o (o.name)}
					<Accordion.Item title={o.name} open>
						{@render choices(
							'option',
							o.values.map((v) => ({
								value: `${o.name}:${v.value}`,
								label: v.value,
								count: v.count,
								on: filters.options.includes(`${o.name}:${v.value}`)
							}))
						)}
					</Accordion.Item>
				{/each}

				<Accordion.Item title={t.availability} open>
					<div class="list">
						<Checkbox name="stock" value="1" checked={filters.stock}>{t.inStockOnly}</Checkbox>
						<Checkbox name="sale" value="1" checked={filters.sale}>{t.onSaleOnly}</Checkbox>
					</div>
				</Accordion.Item>
			</Accordion.Root>
		</div>
	</details>

	<div class="results">
		{#if filtered}
			<ul class="chips" aria-label={t.active}>
				{#each chips as c (c.href)}
					<li>
						<a href={c.href} aria-label={t.remove(c.label)}
							>{c.label} <Icon icon={Cancel01Icon} size={14} /></a
						>
					</li>
				{/each}
				<li><a class="all" href={cleared}>{t.clearAll}</a></li>
			</ul>
		{/if}

		{#if products.items.length}
			<ul class="grid">
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
	</div>
</form>

<style>
	.listing {
		display: grid;
		grid-template-columns: 16rem minmax(0, 1fr);
		align-items: start;
		gap: 1.5rem;
	}
	/* Beside the results as they scroll; a long list of choices scrolls inside it. */
	.filters {
		position: sticky;
		inset-block-start: var(--site-sticky);
	}
	.toggle {
		display: none;
	}
	.card {
		display: grid;
		max-block-size: calc(100dvh - var(--site-sticky) - 1rem);
		overflow-y: auto;
		overscroll-behavior: contain;
		scrollbar-width: thin;
		scrollbar-color: var(--ui-line) transparent;
		padding: 0.25rem 1.125rem;
		border-radius: calc(var(--ui-radius) * 1.5);
		background: var(--ui-surface);
		border: 1px solid var(--border);
	}
	/* The accordion clips while it animates, so content keeps room for focus rings. */
	.pane,
	.list {
		padding: 4px;
	}
	.pane {
		display: grid;
		gap: 0.75rem;
	}
	.list {
		display: grid;
		gap: 0.375rem;
	}
	.cats a {
		display: flex;
		justify-content: space-between;
		gap: 0.5rem;
		inline-size: 100%;
	}
	.n {
		color: var(--ui-muted);
		font-size: 0.75rem;
		font-variant-numeric: tabular-nums;
	}
	.cats a:focus-visible,
	.chips a:focus-visible {
		outline: var(--ui-ring-width) solid var(--ui-ring);
		outline-offset: var(--ui-ring-offset);
		border-radius: 2px;
	}
	.cats {
		display: grid;
		gap: 0.125rem;
		margin: 0;
		padding: 4px;
		list-style: none;
		font-size: 0.875rem;
	}
	.cats a {
		padding: 0.25rem 0;
		color: inherit;
		text-decoration: none;
	}
	.cats a:hover,
	.cats a[aria-current] {
		color: var(--ui-accent);
	}
	.cats a[aria-current] {
		font-weight: 600;
	}
	.range {
		display: grid;
		grid-template-columns: 1fr auto 1fr;
		align-items: center;
		gap: 0.375rem;
		color: var(--ui-muted);
	}
	.pagehead {
		grid-column: 1 / -1;
		display: flex;
		flex-wrap: wrap;
		align-items: end;
		justify-content: space-between;
		gap: 0.75rem 1.5rem;
	}
	.title {
		display: grid;
		gap: 0.75rem;
		min-inline-size: 0;
	}
	.sort {
		inline-size: 12rem;
	}
	.chips {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.375rem;
		margin: -0.25rem 0 1rem;
		padding: 0;
		list-style: none;
	}
	.chips a {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		padding: 0.25rem 0.5rem 0.25rem 0.625rem;
		border-radius: 999px;
		background: color-mix(in oklab, var(--ui-accent) 10%, transparent);
		color: var(--ui-accent);
		font-size: 0.8125rem;
		text-decoration: none;
	}
	.chips a:hover {
		background: color-mix(in oklab, var(--ui-accent) 18%, transparent);
	}
	.chips .all {
		background: none;
		color: var(--ui-muted);
		text-decoration: underline;
	}
	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(min(12.5rem, 100%), 1fr));
		gap: 1rem;
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.pages {
		display: flex;
		justify-content: center;
		gap: 0.5rem;
		margin-block-start: 2rem;
	}
	@media (width < 56rem) {
		.listing {
			grid-template-columns: minmax(0, 1fr);
		}
		.filters {
			position: static;
		}
		.card {
			max-block-size: none;
		}
		/* On phones the filters fold away under a "Filters" button. */
		.toggle {
			display: inline-flex;
			align-items: center;
			gap: 0.5rem;
			padding: 0.5rem 0.875rem;
			border-radius: var(--ui-radius-control);
			background: var(--ui-surface);
			border: 1px solid var(--border);
			font-weight: 500;
			cursor: pointer;
		}
		.filters[open] .toggle {
			margin-block-end: 0.75rem;
		}
		.grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
			gap: 0.625rem;
		}
	}
</style>
