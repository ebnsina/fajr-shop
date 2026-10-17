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
	import RadioCards from '#lib/sinaui/ui/RadioCards.svelte';
	import Price from '#lib/shop/Price.svelte';
	import ProductImage from '#lib/shop/ProductImage.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const p = $derived(data.product);

	// Starts on the first variant in stock, or the first one when all are sold out.
	const start = () => (p.variants.find((v) => v.stock > 0) ?? p.variants[0]).options;
	let chosen = $state<Record<string, string>>({});
	let view = $state(0);
	let quantity = $state(1);
	let adding = $state(false);
	let addError = $state('');
	$effect.pre(() => {
		p.id; // a new product (via a link on this page) starts fresh
		chosen = { ...start() };
		view = 0;
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

	const shots = $derived(p.images.length ? p.images : [undefined]);
	const stockText = $derived(
		!variant
			? pt.notOffered
			: variant.stock === 0
				? pt.soldOut
				: variant.stock <= 3
					? t.onlyLeft(variant.stock)
					: t.inStock
	);
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
	<div class="gallery">
		{#key view}
			<div class="photo">
				<ProductImage
					src={shots[view]?.url}
					alt={shots.length > 1 ? `${p.name}, ${t.picture(view + 1, shots.length)}` : p.name}
					loading="eager"
					zoom
				/>
			</div>
		{/key}
		{#if shots.length > 1}
			<div class="thumbs" role="group" aria-label={t.pictures}>
				{#each shots as shot, i (i)}
					<button
						type="button"
						class={['thumb', view === i && 'on']}
						aria-label={t.picture(i + 1, shots.length)}
						aria-pressed={view === i}
						onclick={() => (view = i)}
					>
						<ProductImage src={shot?.url} alt="" ratio="1" icon={18} />
					</button>
				{/each}
			</div>
		{/if}
	</div>

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
			<RadioCards
				legend={o.name}
				bind:value={() => chosen[o.name], (v) => (chosen[o.name] = v ?? chosen[o.name])}
				options={o.values.map((value) => {
					const v = withValue(o.name, value);
					return {
						value,
						label: value,
						detail: !v ? pt.notOffered : v.stock === 0 ? pt.soldOut : undefined
					};
				})}
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
				<Button type="submit" size="lg" loading={adding}>{c.add}</Button>
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

		{#if p.description}
			<div class="about">
				<h2>{pt.description}</h2>
				<p>{p.description}</p>
			</div>
		{/if}
	</div>
</section>

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
		inset-block-start: 5rem;
		display: grid;
		gap: 0.75rem;
	}
	.photo {
		animation: in var(--ui-dur) var(--ui-ease-out);
	}
	@keyframes in {
		from {
			opacity: 0.4;
		}
	}
	.thumbs {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}
	.thumb {
		inline-size: 4.5rem;
		padding: 0;
		border: 0;
		border-radius: var(--ui-radius);
		background: none;
		opacity: 0.6;
		cursor: pointer;
		transition: opacity var(--ui-dur-press) ease;
	}
	.thumb.on,
	.thumb:hover {
		opacity: 1;
	}
	.thumb:focus-visible {
		outline: var(--ui-ring-width) solid var(--ui-ring);
		outline-offset: var(--ui-ring-offset);
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
	.about h2 {
		margin: 0.5rem 0 0.5rem;
		font-size: 1rem;
	}
	.about p {
		margin: 0;
		color: var(--ui-muted);
		line-height: 1.6;
		white-space: pre-line;
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
	@media (prefers-reduced-motion: reduce) {
		.photo {
			animation: none;
		}
	}
</style>
