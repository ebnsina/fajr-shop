<script lang="ts">
	import { cart as t } from '#lib/copy.js';
	import { formatMoney } from '#lib/money.js';
	import Button from '#lib/sinaui/ui/Button.svelte';
	import EmptyState from '#lib/sinaui/ui/EmptyState.svelte';
	import CartLines from '#lib/shop/CartLines.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const vat = $derived(data.store.vat);
	const rate = $derived(
		new Intl.NumberFormat('en-BD', { style: 'percent', maximumFractionDigits: 2 }).format(
			vat.rate_bp / 10000
		)
	);
</script>

<svelte:head>
	<title>{t.title} · {data.store.name}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<section class="site-container page">
	<h1 class="site-title">{t.title}</h1>
	{#if form && 'message' in form && form.message}<p class="error" role="alert">
			{form.message}
		</p>{/if}
	{#if data.cart.items.length}
		<div class="layout">
			<CartLines items={data.cart.items} />
			<aside class="summary">
				<p class="sub">
					<span>{t.subtotal(data.cart.item_count)}</span>
					<strong>{formatMoney(data.cart.subtotal)}</strong>
				</p>
				<p class="note">
					{vat.enabled && !vat.prices_include_vat ? `${t.vatNote(rate)} ` : ''}{t.note}
				</p>
			</aside>
		</div>
	{:else}
		<EmptyState title={t.empty}>
			{#snippet actions()}<Button href="/shop">{t.browse}</Button>{/snippet}
		</EmptyState>
	{/if}
</section>

<style>
	.page {
		display: grid;
		gap: 1.5rem;
		padding-block: 2rem;
	}
	.layout {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 20rem;
		align-items: start;
		gap: 2rem;
	}
	.summary {
		display: grid;
		gap: 0.5rem;
		padding: 1.25rem;
		border-radius: calc(var(--ui-radius) * 1.5);
		background: var(--ui-subtle);
	}
	.sub {
		display: flex;
		justify-content: space-between;
		margin: 0;
		font-variant-numeric: tabular-nums;
	}
	.note {
		margin: 0;
		color: var(--ui-muted);
		font-size: 0.875rem;
	}
	.error {
		margin: 0;
		color: var(--ui-danger);
	}
	@media (width < 48rem) {
		.layout {
			grid-template-columns: minmax(0, 1fr);
		}
	}
</style>
