<script lang="ts">
	import { Money03Icon } from '@hugeicons/core-free-icons';
	import { ArrowLeft02Icon } from '@hugeicons/core-free-icons';
	import Icon from '#lib/sinaui/ui/Icon.svelte';
	import { untrack } from 'svelte';
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { cart as c, checkoutCopy as t, delivery as d } from '#lib/copy.js';
	import { formatMoney } from '#lib/money.js';
	import Alert from '#lib/sinaui/ui/Alert.svelte';
	import Button from '#lib/sinaui/ui/Button.svelte';
	import CustomSelect from '#lib/sinaui/ui/CustomSelect.svelte';
	import Input from '#lib/sinaui/ui/Input.svelte';
	import RadioCards from '#lib/sinaui/ui/RadioCards.svelte';
	import Textarea from '#lib/sinaui/ui/Textarea.svelte';
	import ProductImage from '#lib/shop/ProductImage.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const cart = $derived(data.cart);
	const fields = $derived((form?.fields ?? {}) as Record<string, string>);
	// What was typed survives a failed attempt; a signed-in customer starts from their account.
	const { start, me, chosen } = untrack(() => ({
		start: form?.values,
		me: data.me,
		chosen: data.district
	}));
	let name = $state(start?.name ?? me?.name ?? '');
	let phone = $state(start?.phone ?? me?.phone?.replace(/^\+88/, '') ?? '');
	let email = $state(start?.email ?? me?.email ?? '');
	let district = $state(start?.district ?? chosen);
	let area = $state(start?.area ?? '');
	let address = $state(start?.address ?? '');
	let note = $state(start?.note ?? '');
	let placing = $state(false);

	const districts = $derived(
		data.districts.map((x) => ({ value: x.name, label: x.name, description: x.division }))
	);
	const pick = (value: string) =>
		goto(`?district=${encodeURIComponent(value)}`, { replace: true, reset: false });
	const vat = $derived(data.store.vat);
	const rate = $derived(
		new Intl.NumberFormat('en-BD', { style: 'percent', maximumFractionDigits: 2 }).format(
			vat.rate_bp / 10000
		)
	);
	const vatOnTop = $derived(
		vat.enabled && !vat.prices_include_vat ? Math.round((cart.total * vat.rate_bp) / 10000) : 0
	);
	const total = $derived(cart.total + (data.quote?.charge ?? 0) + vatOnTop);
</script>

<svelte:head>
	<title>{t.title} · {data.store.name}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<section class="site-container page">
	<div class="top">
		<h1 class="site-title">{t.title}</h1>
		<a class="back" href="/cart"><Icon icon={ArrowLeft02Icon} size={16} /> {t.backToBag}</a>
	</div>

	<form
		method="POST"
		action="?/place"
		class="layout"
		use:enhance={() => {
			placing = true;
			return async ({ update }) => {
				await update({ reset: false });
				placing = false;
			};
		}}
	>
		<div class="steps">
			{#if form?.message}
				<Alert tone="danger" title={form.message} live>
					{#if form.code === 'cart_changed' || form.code === 'insufficient_stock'}<a href="/cart"
							>{t.backToBag}</a
						>{/if}
				</Alert>
			{/if}

			<fieldset class="card">
				<legend>{t.contact}</legend>
				<Input
					label={t.name}
					name="name"
					bind:value={name}
					placeholder={t.namePlaceholder}
					autocomplete="name"
					required
					maxlength={80}
					error={fields.name}
				/>
				<div class="two">
					<Input
						label={t.phone}
						name="phone"
						type="tel"
						inputmode="tel"
						bind:value={phone}
						placeholder="01712345678"
						autocomplete="tel"
						required
						maxlength={20}
						hint={t.phoneHint}
						error={fields.phone}
					/>
					<Input
						label={t.email}
						name="email"
						type="email"
						bind:value={email}
						placeholder="you@example.com"
						autocomplete="email"
						maxlength={254}
						hint={t.emailHint}
						error={fields.email}
					/>
				</div>
			</fieldset>

			<fieldset class="card">
				<legend>{t.address}</legend>
				<div class="two">
					<CustomSelect
						label={t.district}
						name="district"
						options={districts}
						bind:value={district}
						placeholder={t.districtPlaceholder}
						searchable
						searchLabel={t.searchDistricts}
						empty={t.noDistrict}
						required
						error={fields.district}
						onchange={pick}
					/>
					<Input
						label={t.area}
						name="area"
						bind:value={area}
						placeholder={t.areaPlaceholder}
						autocomplete="address-level2"
						required
						maxlength={80}
						error={fields.area}
					/>
				</div>
				<Textarea
					label={t.street}
					name="address"
					bind:value={address}
					placeholder={t.streetPlaceholder}
					autocomplete="street-address"
					required
					maxlength={300}
					error={fields.address}
				/>
				<Textarea
					label={t.note}
					name="note"
					bind:value={note}
					placeholder={t.notePlaceholder}
					maxlength={500}
					error={fields.note}
				/>
			</fieldset>

			<!-- RadioCards' own legend titles this card; no second heading. -->
			<div class="card">
				<RadioCards
					legend={t.payment}
					name="payment_method"
					value="cod"
					layout="list"
					options={[
						{
							value: 'cod',
							label: t.cod,
							description: t.codHint,
							icon: Money03Icon,
							detail: data.quote ? t.due(formatMoney(total)) : undefined
						}
					]}
				/>
			</div>
		</div>

		<aside class="card summary" aria-labelledby="summary">
			<h2 id="summary">{t.summary}</h2>
			<ul class="lines">
				{#each cart.items as it (it.variant_id)}
					<li>
						<span class="thumb"
							><ProductImage src={it.image?.url} alt="" ratio="1" icon={16} /></span
						>
						<span class="name"
							>{it.name}
							{#if Object.keys(it.options).length}<span class="muted"
									>{Object.values(it.options).join(' / ')}</span
								>{/if}
							<span class="muted">× {it.quantity}</span></span
						>
						<strong>{formatMoney(it.line_total)}</strong>
					</li>
				{/each}
			</ul>
			<p class="row">
				<span>{c.subtotal(cart.item_count)}</span><strong>{formatMoney(cart.subtotal)}</strong>
			</p>
			{#if cart.discount?.applies}
				<p class="row">
					<span>{c.discountLine(cart.discount.code)}</span><strong
						>−{formatMoney(cart.discount_total)}</strong
					>
				</p>
			{/if}
			{#if data.quote}
				<p class="row">
					<span>{d.charge} · {data.quote.zone_name}</span><strong
						>{data.quote.free ? d.free : formatMoney(data.quote.charge)}</strong
					>
				</p>
			{:else if data.quoteError}
				<p class="error">{data.quoteError}</p>
			{:else}
				<p class="muted">{t.pickDistrict}</p>
			{/if}
			{#if vatOnTop}
				<p class="row"><span>VAT {rate}</span><strong>{formatMoney(vatOnTop)}</strong></p>
			{/if}
			<p class="row total"><span>{d.total}</span><strong>{formatMoney(total)}</strong></p>
			<span class="cta"
				><Button type="submit" size="lg" loading={placing} disabled={!data.quote}>{t.place}</Button
				></span
			>
			<p class="muted">{t.agree}</p>
		</aside>
	</form>
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
	.back {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		color: var(--brand-700);
		font-size: 0.875rem;
		font-weight: 600;
		text-decoration: none;
	}
	.layout {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 24rem;
		align-items: start;
		gap: 1.5rem;
	}
	.steps {
		display: grid;
		gap: 1.25rem;
	}
	.card {
		display: grid;
		gap: 1rem;
		margin: 0;
		padding: 1.25rem;
		border: 1px solid var(--border);
		border-radius: calc(var(--ui-radius) * 1.5);
		background: var(--bg-surface);
	}
	legend {
		float: left;
		margin-block-end: 0.25rem;
		padding: 0;
		font-size: 1.0625rem;
		font-weight: 600;
	}
	legend + :global(*) {
		clear: both;
	}
	.two {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
		align-items: start;
	}
	.summary {
		position: sticky;
		inset-block-start: var(--site-sticky);
		gap: 0.625rem;
	}
	h2 {
		margin: 0;
		font-size: 1.0625rem;
		font-weight: 600;
	}
	.lines {
		display: grid;
		gap: 0.75rem;
		margin: 0 0 0.25rem;
		padding: 0 0 0.75rem;
		border-block-end: 1px solid var(--border);
		list-style: none;
	}
	.lines li {
		display: grid;
		grid-template-columns: 3rem minmax(0, 1fr) auto;
		gap: 0.75rem;
		align-items: start;
		font-size: 0.875rem;
	}
	.name {
		display: grid;
	}
	.row {
		display: flex;
		justify-content: space-between;
		gap: 1rem;
		margin: 0;
		font-variant-numeric: tabular-nums;
	}
	.total {
		padding-block-start: 0.75rem;
		border-block-start: 1px solid var(--border);
		font-size: 1.125rem;
	}
	.cta {
		--ui-accent: var(--text-primary);
		--ui-on-accent: var(--on-dark);
		display: grid;
	}
	.muted {
		margin: 0;
		color: var(--text-secondary);
		font-size: 0.8125rem;
	}
	.error {
		margin: 0;
		color: var(--danger-700);
		font-size: 0.875rem;
	}
	@media (width < 56rem) {
		.layout,
		.two {
			grid-template-columns: minmax(0, 1fr);
		}
		.summary {
			position: static;
		}
	}
</style>
