<script lang="ts">
	import type { components } from '#lib/api.js';
	import { cart as c, errorText, productPage as pt, shop as t } from '#lib/copy.js';
	import Button from '#lib/sinaui/ui/Button.svelte';
	import Dialog from '#lib/sinaui/ui/Dialog.svelte';
	import Spinner from '#lib/sinaui/ui/Spinner.svelte';
	import OptionChips from './OptionChips.svelte';
	import Price from './Price.svelte';
	import ProductImage from './ProductImage.svelte';
	import { quick } from './quick.svelte.js';

	// Pick options and add to the bag without leaving the list. Add submits the layout's bag form.
	type Product = components['schemas']['Product'];
	let product = $state<Product | null>(null);
	let failed = $state(false);
	let chosen = $state<Record<string, string>>({});

	$effect(() => {
		const slug = quick.slug;
		if (!quick.open || !slug) return;
		product = null;
		failed = false;
		const ctrl = new AbortController();
		fetch(`/p/${encodeURIComponent(slug)}/quick`, { signal: ctrl.signal })
			.then((r) => (r.ok ? (r.json() as Promise<Product>) : Promise.reject(r)))
			.then((p) => {
				product = p;
				// Start on the first variant in stock, as the product page does.
				chosen = { ...(p.variants.find((v) => v.stock > 0) ?? p.variants[0]).options };
			})
			.catch((e) => {
				if (!ctrl.signal.aborted) failed = !!e;
			});
		return () => ctrl.abort();
	});

	const variant = $derived(
		product?.variants.find((v) =>
			product!.options.every((o) => v.options[o.name] === chosen[o.name])
		)
	);
	const withValue = (name: string, value: string) =>
		product?.variants.find((v) =>
			product!.options.every(
				(o) => v.options[o.name] === (o.name === name ? value : chosen[o.name])
			)
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
</script>

<Dialog bind:open={quick.open} title={product?.name ?? c.add} class="quick">
	{#if product}
		<div class="body">
			<span class="thumb"><ProductImage src={product.images[0]?.url} alt="" ratio="1" /></span>
			<div class="info">
				<Price
					amount={variant?.price ?? product.variants[0].price}
					was={variant?.compare_at_price}
				/>
				{#each product.options as o (o.name)}
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
				<p class={['stock', (!variant || variant.stock === 0) && 'out']}>{stockText}</p>
				<a class="more" href="/p/{product.slug}" onclick={() => (quick.open = false)}
					>{c.fullDetails}</a
				>
			</div>
		</div>
	{:else if failed}
		<p class="error">{errorText('internal')}</p>
	{:else}
		<div class="loading"><Spinner /></div>
	{/if}

	{#snippet footer()}
		{#if product}
			<Button
				type="submit"
				form="bag-form"
				name="variant"
				value={variant?.id}
				disabled={!variant || variant.stock === 0}
				onclick={() => setTimeout(() => (quick.open = false))}>{c.add}</Button
			>
		{/if}
	{/snippet}
</Dialog>

<style>
	:global(.dialog.quick) {
		inline-size: min(36rem, 100vw - 2rem);
	}
	.body {
		display: grid;
		grid-template-columns: 9rem minmax(0, 1fr);
		gap: 1.25rem;
	}
	.info {
		display: grid;
		align-content: start;
		gap: 0.875rem;
	}
	.stock {
		margin: 0;
		color: var(--success-700);
		font-weight: 600;
	}
	.out {
		color: var(--text-muted);
	}
	.more {
		color: var(--brand-700);
		font-size: 0.875rem;
	}
	.loading {
		display: grid;
		place-items: center;
		min-block-size: 8rem;
	}
	.error {
		color: var(--danger-700);
	}
	@media (width < 30rem) {
		.body {
			grid-template-columns: minmax(0, 1fr);
		}
		.thumb {
			inline-size: 7rem;
		}
	}
</style>
