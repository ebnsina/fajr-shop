<script lang="ts">
	import { enhance } from '$app/forms';
	import { formatMoney } from '$lib/money';
	import JsonLd from '$lib/components/JsonLd.svelte';
	import { page as appPage } from '$app/state';
	import type { PageData } from './$types';

	// The add-to-bag form posts to /cart?/add, so its result can't be inferred
	// from this route — declare the shape that action actually returns.
	let { data, form }: { data: PageData; form: { error?: string; added?: boolean } | null } = $props();
	const p = $derived(data.product);

	let activeImage = $state(0);
	/** optionId → selected optionValueId */
	let picked = $state<Record<string, string>>({});

	// Single-variant products have nothing to pick, so pre-select it.
	$effect(() => {
		if (p.options.length === 0) picked = {};
	});

	const selected = $derived(
		p.options.length === 0
			? p.variants[0]
			: p.variants.find((v) => {
					const chosen = Object.values(picked);
					return (
						chosen.length === p.options.length &&
						chosen.every((id) => v.optionValueIds.includes(id))
					);
				})
	);

	/** Grey out a value if no variant pairs it with what's already chosen. */
	function reachable(optionId: string, valueId: string): boolean {
		const others = Object.entries(picked).filter(([id]) => id !== optionId).map(([, v]) => v);
		return p.variants.some(
			(v) =>
				v.optionValueIds.includes(valueId) &&
				others.every((o) => v.optionValueIds.includes(o)) &&
				(v.available > 0 || v.allowBackorder)
		);
	}

	const priceMinor = $derived(selected?.priceMinor ?? Math.min(...p.variants.map((v) => v.priceMinor)));
	const compareMinor = $derived(selected?.compareAtMinor ?? null);
	const buyable = $derived(Boolean(selected && (selected.available > 0 || selected.allowBackorder)));
	const needsChoice = $derived(p.options.length > 0 && !selected);

	const money = (m: number) => formatMoney(m, data.store.currency);

	// Product structured data with an AggregateOffer, so a listing with six variants shows one
	// price range rather than six competing results.
	const anyAvailable = $derived(p.variants.some((v) => v.available > 0 || v.allowBackorder));
	const prices = $derived(p.variants.map((v) => v.priceMinor));

	const jsonLd = $derived({
		'@context': 'https://schema.org',
		'@type': 'Product',
		name: p.title,
		description: p.metaDescription ?? p.summary ?? p.title,
		image: p.images.map((i) => i.url),
		...(p.category ? { category: p.category.name } : {}),
		offers: {
			'@type': 'AggregateOffer',
			priceCurrency: data.store.currency,
			lowPrice: (Math.min(...prices) / 100).toFixed(2),
			highPrice: (Math.max(...prices) / 100).toFixed(2),
			offerCount: p.variants.length,
			availability: anyAvailable
				? 'https://schema.org/InStock'
				: 'https://schema.org/OutOfStock',
			url: `${appPage.url.origin}${appPage.url.pathname}`
		}
	});

	const breadcrumbs = $derived({
		'@context': 'https://schema.org',
		'@type': 'BreadcrumbList',
		itemListElement: [
			{ '@type': 'ListItem', position: 1, name: 'Home', item: appPage.url.origin },
			...(p.category
				? [{ '@type': 'ListItem', position: 2, name: p.category.name, item: `${appPage.url.origin}/c/${p.category.slug}` }]
				: []),
			{ '@type': 'ListItem', position: p.category ? 3 : 2, name: p.title }
		]
	});

	let adding = $state(false);
</script>


<JsonLd data={jsonLd} />
<JsonLd data={breadcrumbs} />

{#if p.category}
	<nav class="crumbs"><a href="/c/{p.category.slug}">{p.category.name}</a> <span>/</span> {p.title}</nav>
{/if}

<div class="pdp">
	<!-- gallery -->
	<div class="gallery">
		<div class="main">
			{#if p.images[activeImage]}
				<img
					src={p.images[activeImage].url}
					alt={p.images[activeImage].alt ?? p.title}
					width={p.images[activeImage].width ?? undefined}
					height={p.images[activeImage].height ?? undefined}
				/>
			{:else}
				<div class="placeholder" aria-hidden="true"></div>
			{/if}
		</div>

		{#if p.images.length > 1}
			<ul class="thumbs">
				{#each p.images as image, i (image.url)}
					<li>
						<button
							type="button"
							aria-label="View image {i + 1}"
							aria-current={i === activeImage}
							onclick={() => (activeImage = i)}
						>
							<img src={image.url} alt="" loading="lazy" />
						</button>
					</li>
				{/each}
			</ul>
		{/if}
	</div>

	<!-- buy box -->
	<div class="buy">
		<h1>{p.title}</h1>
		{#if p.summary}<p class="summary">{p.summary}</p>{/if}

		<p class="price">
			{money(priceMinor)}
			{#if compareMinor}<s>{money(compareMinor)}</s>{/if}
		</p>

		{#each p.options as option (option.id)}
			<fieldset>
				<legend>{option.name}</legend>
				<div class="values">
					{#each option.values as value (value.id)}
						{@const isSwatch = Boolean(value.swatchHex)}
						{@const ok = reachable(option.id, value.id)}
						<button
							type="button"
							class:swatch={isSwatch}
							class:on={picked[option.id] === value.id}
							class:out={!ok && picked[option.id] !== value.id}
							style={isSwatch ? `--swatch:${value.swatchHex}` : undefined}
							title={value.value}
							aria-pressed={picked[option.id] === value.id}
							onclick={() => (picked = { ...picked, [option.id]: value.id })}
						>
							{isSwatch ? '' : value.value}
						</button>
					{/each}
				</div>
			</fieldset>
		{/each}

		<form
			method="POST"
			action="/cart?/add"
			use:enhance={() => {
				adding = true;
				return async ({ update }) => {
					await update({ reset: false });
					adding = false;
				};
			}}
		>
			<input type="hidden" name="variantId" value={selected?.id ?? ''} />
			<input type="hidden" name="qty" value="1" />
			<button class="cta" disabled={!buyable || adding}>
				{#if needsChoice}
					Choose {p.options.map((o) => o.name).join(' and ')}
				{:else if adding}
					Adding…
				{:else if buyable}
					Add to bag
				{:else}
					Sold out
				{/if}
			</button>
		</form>

		{#if form?.error}
			<p class="err" role="alert">{form.error}</p>
		{:else if form?.added}
			<p class="ok">Added. <a href="/cart">View bag →</a></p>
		{/if}

		{#if selected && selected.available > 0 && selected.available <= 3}
			<p class="low">Only {selected.available} left</p>
		{/if}

		<p class="cod">Cash on delivery available.</p>

		{#if data.specs.length}
			<table class="specs">
				<caption>Specifications</caption>
				<tbody>
					{#each data.specs as spec (spec.name)}
						<tr>
							<th scope="row">{spec.name}</th>
							<td>{spec.value}{#if spec.unit}{' '}{spec.unit}{/if}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		{/if}

		{#if p.description}
			<div class="description">{p.description}</div>
		{/if}
	</div>
</div>

<style>
	.crumbs {
		font-size: 0.875rem;
		color: var(--c-muted);
		margin-block-end: 1.5rem;
	}
	.crumbs a {
		color: inherit;
	}

	.pdp {
		display: grid;
		gap: var(--grid-gap);
	}

	@media (min-width: 56rem) {
		.pdp {
			grid-template-columns: 3fr 2fr;
			gap: 3rem;
		}
	}

	.main {
		aspect-ratio: var(--card-aspect);
		background: var(--c-surface);
		border-radius: var(--radius);
		overflow: hidden;
	}

	.main img,
	.placeholder {
		inline-size: 100%;
		block-size: 100%;
		object-fit: cover;
		display: block;
	}

	.placeholder {
		background: var(--c-line);
	}

	.thumbs {
		display: flex;
		gap: 0.5rem;
		list-style: none;
		margin: 0.5rem 0 0;
		padding: 0;
		overflow-x: auto;
	}

	.thumbs button {
		inline-size: 4rem;
		block-size: 4rem;
		padding: 0;
		border: 2px solid transparent;
		border-radius: var(--radius);
		overflow: hidden;
		cursor: pointer;
		background: none;
	}

	.thumbs button[aria-current='true'] {
		border-color: var(--c-accent);
	}

	.thumbs img {
		inline-size: 100%;
		block-size: 100%;
		object-fit: cover;
		display: block;
	}

	h1 {
		font-family: var(--font-display);
		font-weight: 400;
		font-size: 1.75rem;
		margin: 0 0 0.5rem;
	}

	.summary {
		color: var(--c-muted);
		margin: 0 0 1rem;
	}

	.price {
		font-size: 1.375rem;
		margin: 0 0 1.5rem;
	}

	.price s {
		color: var(--c-muted);
		font-size: 1rem;
		margin-inline-start: 0.5rem;
	}

	fieldset {
		border: 0;
		padding: 0;
		margin: 0 0 1.25rem;
	}

	legend {
		font-size: 0.875rem;
		color: var(--c-muted);
		padding: 0;
		margin-block-end: 0.5rem;
	}

	.values {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.values button {
		min-inline-size: 2.75rem;
		padding: 0.5rem 0.875rem;
		border: 1px solid var(--c-line);
		border-radius: var(--radius);
		background: var(--c-surface);
		font: inherit;
		cursor: pointer;
	}

	.values button.on {
		border-color: var(--c-text);
	}

	.values button.out {
		opacity: 0.35;
		text-decoration: line-through;
	}

	.values button.swatch {
		inline-size: 2.25rem;
		block-size: 2.25rem;
		min-inline-size: 0;
		padding: 0;
		background: var(--swatch);
	}

	.values button.swatch.on {
		box-shadow: 0 0 0 2px var(--c-surface), 0 0 0 4px var(--c-text);
	}

	.cta {
		inline-size: 100%;
		padding: 0.875rem;
		border: 0;
		border-radius: var(--radius);
		background: var(--c-accent);
		color: var(--c-accent-text);
		font: inherit;
		font-size: 1rem;
		cursor: pointer;
	}

	.cta:disabled {
		background: var(--c-line);
		color: var(--c-muted);
		cursor: not-allowed;
	}

	.err,
	.ok {
		font-size: 0.875rem;
		margin: 0.75rem 0 0;
	}

	.err {
		color: var(--c-sale);
	}

	.ok a {
		color: var(--c-accent);
	}

	.low {
		color: var(--c-sale);
		font-size: 0.875rem;
		margin: 0.75rem 0 0;
	}

	.cod {
		color: var(--c-muted);
		font-size: 0.875rem;
		margin: 1rem 0 0;
	}

	/* A real table, so a screen reader reads "RAM, 16 GB" as a pair. */
	.specs {
		inline-size: 100%;
		margin-block-start: 2rem;
		border-collapse: collapse;
		font-size: 0.9375rem;
	}

	.specs caption {
		text-align: start;
		font-size: 0.8125rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--c-muted);
		padding-block-end: 0.5rem;
	}

	.specs th {
		text-align: start;
		font-weight: 400;
		color: var(--c-muted);
		padding: 0.5rem 1rem 0.5rem 0;
		border-block-end: 1px solid var(--c-line);
		white-space: nowrap;
	}

	.specs td {
		padding: 0.5rem 0;
		border-block-end: 1px solid var(--c-line);
	}

	.description {
		margin-block-start: 2rem;
		padding-block-start: 1.5rem;
		border-block-start: 1px solid var(--c-line);
		white-space: pre-wrap;
		line-height: 1.7;
	}
</style>
