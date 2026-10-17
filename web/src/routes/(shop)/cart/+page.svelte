<script lang="ts">
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import X from '@lucide/svelte/icons/x';
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { cart as t, delivery as d } from '#lib/copy.js';
	import { formatMoney } from '#lib/money.js';
	import Button from '#lib/sinaui/ui/Button.svelte';
	import CustomSelect from '#lib/sinaui/ui/CustomSelect.svelte';
	import EmptyState from '#lib/sinaui/ui/EmptyState.svelte';
	import Input from '#lib/sinaui/ui/Input.svelte';
	import CartLines from '#lib/shop/CartLines.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const cart = $derived(data.cart);
	const code = $derived(cart.discount);
	const codeError = $derived(form && 'codeError' in form ? form.codeError : undefined);
	const vat = $derived(data.store.vat);
	const rate = $derived(
		new Intl.NumberFormat('en-BD', { style: 'percent', maximumFractionDigits: 2 }).format(
			vat.rate_bp / 10000
		)
	);
	const districts = $derived(
		data.districts.map((x) => ({ value: x.name, label: x.name, description: x.division }))
	);
	// The estimate lives in the address (?district=), so it survives a reload and can be shared.
	const pick = (district: string) =>
		goto(`?district=${encodeURIComponent(district)}`, { replace: true, reset: false });
</script>

<svelte:head>
	<title>{t.title} · {data.store.name}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<section class="site-container page">
	<div class="top">
		<h1 class="site-title">
			{t.title}{#if cart.item_count}<span class="count">{t.items(cart.item_count)}</span>{/if}
		</h1>
		<a class="back" href="/shop"><ArrowLeft size={16} /> {t.keepShopping}</a>
	</div>
	{#if form && 'message' in form && form.message}<p class="error" role="alert">
			{form.message}
		</p>{/if}

	{#if cart.items.length}
		<div class="layout">
			<div class="card lines"><CartLines items={cart.items} /></div>

			<aside class="card summary" aria-labelledby="summary">
				<h2 id="summary">{t.summary}</h2>
				<p class="row">
					<span>{t.subtotal(cart.item_count)}</span>
					<strong>{formatMoney(cart.subtotal)}</strong>
				</p>

				{#if code}
					<div class="row">
						<span class="code">
							{t.discountLine(code.code)}
							<form method="post" action="?/uncode" use:enhance class="inline">
								<button type="submit" class="remove" aria-label={t.removeCode(code.code)}
									><X size={14} /></button
								>
							</form>
						</span>
						<strong class={[code.applies && 'saving']}
							>{code.applies ? `−${formatMoney(code.amount)}` : '—'}</strong
						>
					</div>
					{#if code.description}<p class="note">{code.description}</p>{/if}
					{#if code.reason}
						<p class="note warn">
							{t.codeWaits[code.reason](formatMoney(code.min_subtotal - cart.subtotal))}
						</p>
					{/if}
				{:else}
					<form method="post" action="?/code" use:enhance class="apply">
						<Input
							label={t.code}
							hideLabel
							name="code"
							autocomplete="off"
							autocapitalize="characters"
							maxlength={30}
							placeholder={t.codePlaceholder}
							value={form && 'code' in form ? form.code : ''}
							error={codeError}
						/>
						<Button type="submit" variant="secondary">{t.useCode}</Button>
					</form>
				{/if}

				<hr />

				<form method="get" class="estimate">
					<CustomSelect
						label={d.to}
						name="district"
						options={districts}
						value={data.district}
						placeholder={d.choose}
						searchable
						searchLabel={d.search}
						empty={d.noMatch}
						onchange={pick}
					/>
					<noscript><Button type="submit" variant="secondary">{d.check}</Button></noscript>
				</form>
				{#if data.quote}
					<p class="row">
						<span>{d.charge}</span>
						<strong>{data.quote.free ? d.free : formatMoney(data.quote.charge)}</strong>
					</p>
					<p class="note">{d.days(data.quote.delivery_days)} · {data.quote.zone_name}</p>
				{:else if data.quoteError}
					<p class="error" role="alert">{data.quoteError}</p>
				{/if}

				<p class="row total">
					<span>{d.total}</span>
					<strong>{formatMoney(cart.total + (data.quote?.charge ?? 0))}</strong>
				</p>
				<p class="note">
					{vat.enabled && !vat.prices_include_vat ? `${t.vatNote(rate)} ` : ''}{data.quote
						? ''
						: t.note}
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
		gap: 1.25rem;
		padding-block: 2rem 3rem;
	}
	.top {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		justify-content: space-between;
		gap: 0.5rem 1rem;
	}
	.top h1 {
		margin: 0;
	}
	.count {
		margin-inline-start: 0.625rem;
		color: var(--ui-muted);
		font-size: 1rem;
		font-weight: 500;
	}
	.back {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		color: var(--ui-accent);
		font-size: 0.875rem;
		font-weight: 600;
		text-decoration: none;
	}
	.back:hover {
		text-decoration: underline;
	}
	.layout {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 22rem;
		align-items: start;
		gap: 1.5rem;
	}
	.card {
		padding: 1.25rem;
		border-radius: calc(var(--ui-radius) * 1.5);
		background: var(--ui-surface);
		border: 1px solid var(--border);
	}
	.summary {
		position: sticky;
		inset-block-start: var(--site-sticky);
		display: grid;
		gap: 0.625rem;
	}
	h2 {
		margin: 0 0 0.25rem;
		font-size: 1.0625rem;
		font-weight: 600;
	}
	.row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		margin: 0;
		font-variant-numeric: tabular-nums;
	}
	.row strong {
		font-weight: 600;
	}
	.saving {
		color: var(--ui-accent);
	}
	.code {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
	}
	.inline {
		display: contents;
	}
	.remove {
		display: inline-grid;
		place-items: center;
		inline-size: 1.5rem;
		block-size: 1.5rem;
		padding: 0;
		border: 0;
		border-radius: 50%;
		background: none;
		color: var(--ui-muted);
		cursor: pointer;
	}
	.remove:hover {
		background: var(--ui-subtle);
		color: var(--ui-fg);
	}
	.remove:focus-visible,
	.back:focus-visible {
		outline: var(--ui-ring-width) solid var(--ui-ring);
		outline-offset: var(--ui-ring-offset);
	}
	.apply {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		align-items: start;
		gap: 0.5rem;
	}
	hr {
		inline-size: 100%;
		margin: 0.25rem 0;
		border: 0;
		border-block-start: 1px solid var(--ui-line);
	}
	.estimate {
		display: grid;
		gap: 0.5rem;
	}
	.total {
		margin-block-start: 0.25rem;
		padding-block-start: 0.75rem;
		border-block-start: 1px solid var(--ui-line);
		font-size: 1.125rem;
	}
	.total strong {
		font-weight: 700;
	}
	.note {
		margin: 0;
		color: var(--ui-muted);
		font-size: 0.8125rem;
	}
	.warn {
		color: var(--ui-warning);
	}
	.error {
		margin: 0;
		color: var(--ui-danger);
	}
	@media (width < 56rem) {
		.layout {
			grid-template-columns: minmax(0, 1fr);
		}
		.summary {
			position: static;
		}
	}
</style>
