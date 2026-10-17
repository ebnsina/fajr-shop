<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import Truck from '@lucide/svelte/icons/truck';
	import { cart as c, delivery as dl, productPage as pt, shop as t } from '#lib/copy.js';
	import { formatMoney } from '#lib/money.js';
	import Button from '#lib/sinaui/ui/Button.svelte';
	import NumberField from '#lib/sinaui/ui/NumberField.svelte';
	import { toast } from '#lib/sinaui/ui/toast/index.js';
	import { bag } from '#lib/shop/bag.svelte.js';
	import OptionChips from '#lib/shop/OptionChips.svelte';
	import Price from '#lib/shop/Price.svelte';
	import Gallery from '#lib/shop/Gallery.svelte';
	import ProductRow from '#lib/shop/ProductRow.svelte';
	import * as Tabs from '#lib/sinaui/ui/tabs/index.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const p = $derived(data.product);

	// Starts on the first variant in stock, or the first one when all are sold out.
	const start = () => (p.variants.find((v) => v.stock > 0) ?? p.variants[0]).options;
	let chosen = $state<Record<string, string>>({});
	let quantity = $state(1);
	let adding = $state(false);
	let addError = $state('');
	$effect.pre(() => {
		p.id; // a new product (via a link on this page) starts fresh
		chosen = { ...start() };
		quantity = 1;
	});

	const variant = $derived(
		p.variants.find((v) => p.options.every((o) => v.options[o.name] === chosen[o.name]))
	);
	/** The variant a value would give with the other choices as they are. */
	const withValue = (name: string, value: string) =>
		p.variants.find((v) =>
			p.options.every((o) => v.options[o.name] === (o.name === name ? value : chosen[o.name]))
		);

	const stockText = $derived(
		!variant
			? pt.notOffered
			: variant.stock === 0
				? pt.soldOut
				: variant.stock <= 3
					? t.onlyLeft(variant.stock)
					: t.inStock
	);
	let tab = $state('description');
	// Paragraphs split by a blank line; a paragraph whose lines all start with "- " is a list.
	const blocks = $derived(
		p.description
			.split(/\n\s*\n/)
			.map((b) =>
				b
					.split('\n')
					.map((l) => l.trim())
					.filter(Boolean)
			)
			.filter((lines) => lines.length)
			.map((lines) => {
				const list = lines.every((l) => /^[-•]\s/.test(l));
				return { list, lines: list ? lines.map((l) => l.replace(/^[-•]\s+/, '')) : lines };
			})
	);
	const grams = new Intl.NumberFormat('en-BD', { style: 'unit', unit: 'gram' });
	const kilos = new Intl.NumberFormat('en-BD', {
		style: 'unit',
		unit: 'kilogram',
		maximumFractionDigits: 2
	});
	const weight = (g: number) => (g >= 1000 ? kilos.format(g / 1000) : grams.format(g));
	const vatRate = $derived(
		new Intl.NumberFormat('en-BD', { style: 'percent', maximumFractionDigits: 2 }).format(
			data.store.vat.rate_bp / 10000
		)
	);
	const summary = $derived(p.description.split('\n')[0].slice(0, 160) || p.name);

	// Built as one escaped string, so the description can't close the script tag.
	const ld = $derived(
		`<script type="application/ld+json">${JSON.stringify({
			'@context': 'https://schema.org',
			'@type': 'Product',
			name: p.name,
			description: p.description,
			image: p.images.map((i) => i.url),
			sku: variant?.sku ?? undefined,
			offers: p.variants.map((v) => ({
				'@type': 'Offer',
				price: (v.price / 100).toFixed(2),
				priceCurrency: p.currency,
				availability: v.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock'
			}))
		}).replace(/</g, '\\u003c')}</` + 'script>'
	);
</script>

<svelte:head>
	<title>{p.name} · {data.store.name}</title>
	<meta name="description" content={summary} />
	<meta property="og:title" content="{p.name} · {data.store.name}" />
	<meta property="og:description" content={summary} />
	<meta property="og:type" content="product" />
	<meta property="og:url" content="{page.url.origin}/p/{p.slug}" />
	{#if p.images[0]}<meta property="og:image" content={p.images[0].url} />{/if}
	<link rel="canonical" href="{page.url.origin}/p/{p.slug}" />
	<!-- eslint-disable-next-line svelte/no-at-html-tags -- our own JSON, with < escaped -->
	{@html ld}
</svelte:head>

<section class="site-container top">
	<nav class="site-crumbs" aria-label="Breadcrumb">
		<a href="/">{t.home}</a> <span aria-hidden="true">/</span>
		{#if p.category}
			<a href="/c/{p.category.slug}">{p.category.name}</a> <span aria-hidden="true">/</span>
		{/if}
		<span aria-current="page">{p.name}</span>
	</nav>
</section>

<section class="site-container product">
	<div class="gallery"><Gallery images={p.images} name={p.name} /></div>

	<div class="buy">
		<h1 class="site-title">{p.name}</h1>
		<Price
			amount={variant?.price ?? p.variants[0].price}
			was={variant?.compare_at_price}
			size="lg"
		/>
		{#if data.store.vat.enabled}
			<p class="vat">
				{data.store.vat.prices_include_vat ? t.vatIncluded : t.vatAdded(vatRate)}
			</p>
		{/if}

		{#each p.options as o (o.name)}
			<OptionChips
				legend={o.name}
				values={o.values}
				bind:value={() => chosen[o.name], (v) => (chosen[o.name] = v ?? chosen[o.name])}
				unavailable={(value) => {
					const v = withValue(o.name, value);
					return !v ? 'not_offered' : v.stock === 0 ? 'sold_out' : null;
				}}
			/>
		{/each}

		<p
			class={[
				'stock',
				(!variant || variant.stock === 0) && 'out',
				variant && variant.stock > 0 && variant.stock <= 3 && 'low'
			]}
			aria-live="polite"
		>
			{stockText}
		</p>

		{#if variant && variant.stock > 0}
			<form
				method="POST"
				action="/cart?/add"
				class="add"
				use:enhance={() => {
					adding = true;
					addError = '';
					// The action lives on /cart; refresh the data here rather than going there.
					return async ({ result }) => {
						adding = false;
						if (result.type === 'failure') {
							addError = String(result.data?.message ?? '');
							return;
						}
						await invalidateAll();
						if (result.type === 'success') {
							toast.success(String(result.data?.added ?? ''));
							bag.open = true;
						}
					};
				}}
			>
				<input type="hidden" name="variant" value={variant.id} />
				<div class="qty">
					<NumberField
						label={c.quantity}
						name="quantity"
						bind:value={quantity}
						min={1}
						max={Math.min(99, variant.stock)}
					/>
				</div>
				<Button type="submit" loading={adding}>{c.add}</Button>
			</form>
			{#if addError}<p class="add-error" role="alert">{addError}</p>{/if}
		{/if}

		{#if data.zones.length}
			<div class="delivery">
				<p class="dtitle"><Truck size={18} /> {dl.zones}</p>
				<ul>
					{#each data.zones as z (z.id)}
						<li>
							<span>{z.name}</span><span>{formatMoney(z.base_charge)} · {z.delivery_days}</span>
						</li>
					{/each}
				</ul>
			</div>
		{/if}
	</div>
</section>

<section class="site-container sections" aria-label={pt.sections}>
	<Tabs.Root bind:value={tab}>
		<Tabs.List label={pt.sections}>
			<Tabs.Tab value="description">{pt.description}</Tabs.Tab>
			<Tabs.Tab value="details">{pt.details}</Tabs.Tab>
		</Tabs.List>
		<Tabs.Panel value="description">
			<div class="prose">
				{#each blocks as b, i (i)}
					{#if b.list}
						<ul>
							{#each b.lines as line, j (j)}<li>{line}</li>{/each}
						</ul>
					{:else}
						<p>{b.lines.join(' ')}</p>
					{/if}
				{:else}
					<p class="muted">{pt.noDescription}</p>
				{/each}
			</div>
		</Tabs.Panel>
		<Tabs.Panel value="details">
			<dl class="specs">
				{#if p.brand}<dt>{pt.brand}</dt>
					<dd>{p.brand}</dd>{/if}
				{#if p.category}<dt>{pt.category}</dt>
					<dd><a href="/c/{p.category.slug}">{p.category.name}</a></dd>{/if}
				{#each p.options as o (o.name)}<dt>{o.name}</dt>
					<dd>{o.values.join(', ')}</dd>{/each}
				{#if variant?.sku}<dt>{pt.sku}</dt>
					<dd>{variant.sku}</dd>{/if}
				{#if variant}<dt>{pt.weight}</dt>
					<dd>{weight(variant.weight_g)}</dd>{/if}
			</dl>
		</Tabs.Panel>
	</Tabs.Root>
</section>

{#if data.similar.length && p.category}
	<ProductRow id="similar" title={pt.similar} href="/c/{p.category.slug}" products={data.similar} />
{/if}

<style>
	.top {
		padding-block: 1.5rem 1rem;
	}
	.product {
		display: grid;
		grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr);
		gap: 3rem;
		align-items: start;
	}
	.gallery {
		position: sticky;
		inset-block-start: var(--site-sticky);
	}
	.buy {
		display: grid;
		gap: 1rem;
		min-inline-size: 0;
	}
	.vat {
		margin: -0.5rem 0 0;
		color: var(--ui-muted);
		font-size: 0.875rem;
	}
	.stock {
		margin: 0;
		color: var(--ui-accent);
		font-weight: 500;
	}
	.low {
		color: var(--ui-warning);
	}
	.out {
		color: var(--ui-muted);
	}
	.add {
		display: flex;
		flex-wrap: wrap;
		align-items: end;
		gap: 0.75rem;
	}
	.qty {
		inline-size: 8rem;
	}
	.add > :global(.btn) {
		flex: 1;
	}
	.add-error {
		margin: 0;
		color: var(--ui-danger);
	}
	.delivery {
		padding: 0.875rem 1rem;
		border-radius: var(--ui-radius);
		background: var(--ui-surface);
		font-size: 0.875rem;
	}
	.dtitle {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin: 0 0 0.5rem;
		font-weight: 600;
	}
	.delivery ul {
		display: grid;
		gap: 0.25rem;
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.delivery li {
		display: flex;
		justify-content: space-between;
		gap: 1rem;
		color: var(--ui-muted);
	}
	.sections {
		margin-block-start: 3rem;
	}
	.prose,
	.specs {
		max-inline-size: 48rem;
		padding-block: 1.25rem 0;
	}
	.prose p,
	.prose ul {
		margin: 0 0 0.875rem;
		line-height: 1.65;
	}
	.prose ul {
		padding-inline-start: 1.25rem;
	}
	.muted {
		color: var(--ui-muted);
	}
	.specs {
		display: grid;
		grid-template-columns: minmax(8rem, max-content) minmax(0, 1fr);
		margin: 0;
	}
	.specs dt,
	.specs dd {
		margin: 0;
		padding: 0.625rem 0;
		border-block-end: 1px solid var(--ui-line);
	}
	.specs dt {
		padding-inline-end: 2rem;
		color: var(--ui-muted);
	}
	.specs a {
		color: var(--ui-accent);
	}
	@media (width < 56rem) {
		.product {
			grid-template-columns: minmax(0, 1fr);
			gap: 2rem;
		}
		.gallery {
			position: static;
		}
	}
</style>
