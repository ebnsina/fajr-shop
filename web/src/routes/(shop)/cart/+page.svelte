<script lang="ts">
	import X from '@lucide/svelte/icons/x';
	import { enhance } from '$app/forms';
	import { cart as t, delivery as d } from '#lib/copy.js';
	import Input from '#lib/sinaui/ui/Input.svelte';
	import Select from '#lib/sinaui/ui/Select.svelte';
	import { formatMoney } from '#lib/money.js';
	import Button from '#lib/sinaui/ui/Button.svelte';
	import EmptyState from '#lib/sinaui/ui/EmptyState.svelte';
	import CartLines from '#lib/shop/CartLines.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const vat = $derived(data.store.vat);
	const cart = $derived(data.cart);
	const code = $derived(cart.discount);
	const codeError = $derived(form && 'codeError' in form ? form.codeError : undefined);
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
				{#if code}
					<div class="sub discount">
						<span>
							{t.discountLine(code.code)}
							<form method="post" action="?/uncode" use:enhance class="inline">
								<button type="submit" class="remove" aria-label={t.removeCode(code.code)}
									><X size={14} /></button
								>
							</form>
						</span>
						<strong>{code.applies ? `−${formatMoney(code.amount)}` : '—'}</strong>
					</div>
					{#if code.description}<p class="note">{code.description}</p>{/if}
					{#if code.reason}
						<p class="note warn">
							{t.codeWaits[code.reason](formatMoney(code.min_subtotal - cart.subtotal))}
						</p>
					{/if}
				{:else}
					<form method="post" action="?/code" use:enhance class="code">
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
				{#if cart.discount_total && !data.quote}
					<p class="sub total">
						<span>{t.afterDiscount}</span>
						<strong>{formatMoney(cart.total)}</strong>
					</p>
				{/if}
				<form method="get" class="estimate">
					<Select
						label={d.to}
						name="district"
						value={data.district}
						placeholder={d.choose}
						onchange={(e: Event) => (e.currentTarget as HTMLSelectElement).form?.requestSubmit()}
					>
						{#each Map.groupBy(data.districts, (x) => x.division) as [division, list] (division)}
							<optgroup label={division}>
								{#each list as x (x.name)}<option value={x.name}>{x.name}</option>{/each}
							</optgroup>
						{/each}
					</Select>
					<noscript><Button type="submit" variant="secondary">{d.check}</Button></noscript>
				</form>
				{#if data.quote}
					<p class="sub">
						<span>{d.charge}</span>
						<strong>{data.quote.free ? d.free : formatMoney(data.quote.charge)}</strong>
					</p>
					<p class="note">{d.days(data.quote.delivery_days)} · {data.quote.zone_name}</p>
					<p class="sub total">
						<span>{d.total}</span>
						<strong>{formatMoney(cart.total + data.quote.charge)}</strong>
					</p>
				{:else if data.quoteError}
					<p class="error" role="alert">{data.quoteError}</p>
				{/if}
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
	.code {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		align-items: start;
		gap: 0.5rem;
		margin-block: 0.25rem;
	}
	.discount span {
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
		background: var(--ui-line);
		color: var(--ui-fg);
	}
	.remove:focus-visible {
		outline: var(--ui-ring-width) solid var(--ui-ring);
		outline-offset: var(--ui-ring-offset);
	}
	.warn {
		color: var(--ui-warning);
	}
	.estimate {
		display: grid;
		gap: 0.5rem;
		margin-block: 0.5rem;
	}
	.total {
		padding-block-start: 0.5rem;
		box-shadow: 0 -1px 0 var(--ui-line);
		font-size: 1.0625rem;
	}
	@media (width < 48rem) {
		.layout {
			grid-template-columns: minmax(0, 1fr);
		}
	}
</style>
