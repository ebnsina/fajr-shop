<script lang="ts">
	import SlidersHorizontal from '@lucide/svelte/icons/sliders-horizontal';
	import X from '@lucide/svelte/icons/x';
	import { page } from '$app/state';
	import type { components } from '#lib/api.js';
	import { shop as t } from '#lib/copy.js';
	import { formatMoney } from '#lib/money.js';
	import type { Facets, Filters } from '#lib/server/listing.js';
	import Button from '#lib/sinaui/ui/Button.svelte';
	import Checkbox from '#lib/sinaui/ui/Checkbox.svelte';
	import EmptyState from '#lib/sinaui/ui/EmptyState.svelte';
	import Input from '#lib/sinaui/ui/Input.svelte';
	import Select from '#lib/sinaui/ui/Select.svelte';
	import ProductCard from './ProductCard.svelte';

	// Filters in a side card, sorting above the results. It's one plain GET form, so a filtered
	// list works without JavaScript and every filtered page has its own address.
	let {
		products,
		facets,
		filters,
		paged
	}: {
		products: components['schemas']['ProductPage'];
		facets: Facets | null;
		filters: Filters;
		paged: boolean;
	} = $props();

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

	const submit = (e: Event) => (e.currentTarget as HTMLElement).closest('form')?.requestSubmit();
	// Ticking a box applies it straight away; prices wait for Apply so typing isn't interrupted.
	const onchange = (e: Event) => {
		if ((e.target as HTMLInputElement).type === 'checkbox') submit(e);
	};
</script>

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
		<details class="more" open={rest.some((c) => c.on)}>
			<summary>{t.more(rest.length)}</summary>
			{@render boxes(name, rest)}
		</details>
	{/if}
{/snippet}

<form method="get" class="listing" {onchange}>
	{#if filters.q}<input type="hidden" name="q" value={filters.q} />{/if}
	{#if filters.category}<input type="hidden" name="category" value={filters.category} />{/if}
	{#if filters.featured}<input type="hidden" name="featured" value="1" />{/if}

	<details class="filters" open>
		<summary class="toggle"><SlidersHorizontal size={16} /> {t.filters}</summary>
		<div class="card">
			{#if facets && facets.categories.length > 1}
				<details class="group" open>
					<summary>{t.category}</summary>
					<ul class="cats">
						{#each facets.categories as c (c.slug)}
							<li>
								<a
									href={categoryHref(c.slug)}
									aria-current={c.slug === filters.category || undefined}
									>{c.name}<span class="n">{num.format(c.count)}</span></a
								>
							</li>
						{/each}
					</ul>
				</details>
			{/if}

			<details class="group" open>
				<summary>{t.priceRange}</summary>
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
				<Button type="submit" variant="secondary" size="sm">{t.apply}</Button>
			</details>

			{#if facets?.brands.length}
				<details class="group" open>
					<summary>{t.brand}</summary>
					{@render choices(
						'brand',
						facets.brands.map((b) => ({
							value: b.name,
							label: b.name,
							count: b.count,
							on: filters.brands.includes(b.name)
						}))
					)}
				</details>
			{/if}

			{#each facets?.options ?? [] as o (o.name)}
				<details class="group" open>
					<summary>{o.name}</summary>
					{@render choices(
						'option',
						o.values.map((v) => ({
							value: `${o.name}:${v.value}`,
							label: v.value,
							count: v.count,
							on: filters.options.includes(`${o.name}:${v.value}`)
						}))
					)}
				</details>
			{/each}

			<details class="group" open>
				<summary>{t.availability}</summary>
				<Checkbox name="stock" value="1" checked={filters.stock}>{t.inStockOnly}</Checkbox>
				<Checkbox name="sale" value="1" checked={filters.sale}>{t.onSaleOnly}</Checkbox>
			</details>
		</div>
	</details>

	<div class="results">
		<div class="bar">
			<p class="count">{t.showing(products.items.length, !!products.next_cursor)}</p>
			<div class="sort">
				<Select label={t.sort} hideLabel name="sort" value={filters.sort} onchange={submit}>
					{#each Object.entries(t.sorts) as [value, label] (value)}<option {value}>{label}</option
						>{/each}
				</Select>
			</div>
		</div>

		{#if filtered}
			<ul class="chips" aria-label={t.active}>
				{#each chips as c (c.href)}
					<li>
						<a href={c.href} aria-label={t.remove(c.label)}>{c.label} <X size={14} /></a>
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
	.toggle {
		display: none;
	}
	.card {
		display: grid;
		padding: 0.25rem 1rem;
		border-radius: var(--ui-radius);
		background: var(--ui-surface);
		box-shadow: var(--ui-shadow-xs);
		overscroll-behavior: contain;
	}
	.group {
		display: grid;
		gap: 0.5rem;
		padding-block: 0.875rem;
	}
	.group + .group {
		border-block-start: 1px solid var(--ui-line);
	}
	.group > summary {
		display: flex;
		justify-content: space-between;
		font-size: 0.8125rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.03em;
		list-style: none;
		cursor: pointer;
	}
	.group > summary::-webkit-details-marker {
		display: none;
	}
	.group > summary::after {
		content: '−';
		color: var(--ui-muted);
	}
	.group:not([open]) > summary::after {
		content: '+';
	}
	.group[open] > summary {
		margin-block-end: 0.25rem;
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
	.more > summary {
		inline-size: fit-content;
		color: var(--ui-accent);
		font-size: 0.875rem;
		font-weight: 500;
		list-style: none;
		cursor: pointer;
	}
	.more > summary::-webkit-details-marker {
		display: none;
	}
	.more[open] > summary {
		margin-block-end: 0.375rem;
	}
	:is(.group, .more) > summary:focus-visible,
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
		padding: 0;
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
	.bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		margin-block-end: 1rem;
	}
	.count {
		margin: 0;
		color: var(--ui-muted);
		font-size: 0.875rem;
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
		/* On phones the filters fold away under a "Filters" button. */
		.toggle {
			display: inline-flex;
			align-items: center;
			gap: 0.5rem;
			padding: 0.5rem 0.875rem;
			border-radius: var(--ui-radius-control);
			background: var(--ui-surface);
			box-shadow: var(--ui-shadow-xs);
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
