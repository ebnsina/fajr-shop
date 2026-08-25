<script lang="ts">
	import { superForm } from 'sveltekit-superforms';
	import { moneyFor } from '$lib/money';
	import { page } from '$app/state';

	let { data } = $props();

	// svelte-ignore state_referenced_locally
	const { form, errors, enhance, submitting } = superForm(data.form, { resetForm: false });


	const money = $derived(moneyFor({ currency: data.store.currency, locale: data.store.numberLocale }));

	/** Delivery depends on the district, so it updates as they choose. */
	const inDhaka = $derived($form.district === 'Dhaka');
	const shippingMinor = $derived(inDhaka ? 6000 : 12000);

	/** Applied coupon, if the customer has checked one. Re-verified on submit. */
	const coupon = $derived(page.form?.coupon ?? null);
	const discountMinor = $derived(
		coupon ? (coupon.freeShipping ? shippingMinor : coupon.discountMinor) : 0
	);
	const totalMinor = $derived(
		Math.max(0, data.cart.subtotalMinor + shippingMinor - discountMinor)
	);
	const advanceMinor = $derived($form.paymentMethod === 'bkash_manual' ? totalMinor : shippingMinor);

	/** Captured as typed, so an abandoned cart has somebody to remind. */
	async function capturePhone(value: string) {
		if (value.replace(/\D/g, '').length < 10) return;
		await fetch('/api/cart/phone', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ phone: value })
		}).catch(() => {});
	}
</script>


<h1>Checkout</h1>

<!-- Declared before the order form so its controls can point at it by id. -->
<form method="POST" action="?/coupon" id="promo-form" use:enhance></form>

<form method="POST" action="?/place" use:enhance class="layout">
	<div class="fields">
		<!-- Four fields, one screen. Account creation is the biggest drop-off. -->
		<label>
			<span>Your name</span>
			<input bind:value={$form.name} autocomplete="name" required />
			{#if $errors.name}<em>{$errors.name}</em>{/if}
		</label>

		<label>
			<span>Mobile number</span>
			<input
				bind:value={$form.phone}
				type="tel"
				inputmode="numeric"
				autocomplete="tel"
				placeholder="01XXXXXXXXX"
				required
				onblur={(e) => capturePhone(e.currentTarget.value)}
			/>
			{#if $errors.phone}<em>{$errors.phone}</em>{/if}
			<small>We call this number to confirm your order.</small>
		</label>

		<div class="pair">
			<label>
				<!-- District in Dhaka, Emirate in Dubai. The shop's country decides. -->
				<span>{data.areaLabel}</span>
				<select bind:value={$form.district} required>
					<option value="">Choose…</option>
					{#each Object.entries(data.areas) as [group, list] (group)}
						<optgroup label={group}>
							{#each list as area (area)}
								<option value={area}>{area}</option>
							{/each}
						</optgroup>
					{/each}
				</select>
				{#if $errors.district}<em>{$errors.district}</em>{/if}
			</label>

			{#if data.subAreaLabel}
				<label>
					<span>{data.subAreaLabel}</span>
					<input bind:value={$form.thana} autocomplete="address-level3" />
				</label>
			{/if}
		</div>

		<label>
			<span>Address</span>
			<textarea
				bind:value={$form.detail}
				rows="3"
				placeholder="House, road, area — and a landmark if there is one"
				autocomplete="street-address"
				required
			></textarea>
			{#if $errors.detail}<em>{$errors.detail}</em>{/if}
		</label>

		<label>
			<span>Note for us <small>(optional)</small></span>
			<input bind:value={$form.note} />
		</label>

		<fieldset>
			<legend>Payment</legend>
			<label class="choice">
				<input type="radio" bind:group={$form.paymentMethod} value="cod" />
				<span>
					<strong>Cash on delivery</strong>
					<small>Pay {money(shippingMinor)} delivery charge now, the rest to the courier.</small>
				</span>
			</label>
			<label class="choice">
				<input type="radio" bind:group={$form.paymentMethod} value="bkash_manual" />
				<span>
					<!-- bKash in Dhaka, bank transfer in Dubai. -->
					<strong>{data.store.profile.manualPayLabel} — pay in full</strong>
					<small>{data.store.profile.manualPayHint}</small>
				</span>
			</label>
		</fieldset>
	</div>

	<aside class="summary">
		{#if page.form?.stockError}
			<p class="alert" role="alert">{page.form.stockError}</p>
		{/if}

		<ul>
			{#each data.cart.lines as line (line.id)}
				<li>
					<span class="qty">{line.qty}×</span>
					<span class="name">
						{line.title}
						{#if line.variantTitle}<small>{line.variantTitle}</small>{/if}
					</span>
					<span class="amt">{money(line.totalMinor)}</span>
				</li>
			{/each}
		</ul>

		<!-- Associated with the promo form declared outside the order form: a
		     form cannot nest inside another, and checking a code must not submit
		     the order. -->
		<div class="promo">
			<input name="code" form="promo-form" placeholder="Promo code" value={page.form?.couponCode ?? ''} />
			<input type="hidden" name="phone" form="promo-form" value={$form.phone} />
			<button type="submit" form="promo-form">Apply</button>
		</div>

		{#if page.form?.couponError}
			<p class="promo-msg err">{page.form.couponError}</p>
		{:else if coupon}
			<p class="promo-msg ok">{coupon.code} applied</p>
		{/if}

		<div class="row"><span>Subtotal</span><span>{money(data.cart.subtotalMinor)}</span></div>
		<div class="row">
			<span>Delivery {#if $form.district}<small>· {inDhaka ? 'Inside Dhaka' : 'Outside Dhaka'}</small>{/if}</span>
			<span>{money(shippingMinor)}</span>
		</div>
		{#if discountMinor > 0}
			<div class="row discount"><span>Discount</span><span>−{money(discountMinor)}</span></div>
		{/if}
		<div class="row total"><span>Total</span><span>{money(totalMinor)}</span></div>

		{#if advanceMinor > 0}
			<p class="advance">Pay {money(advanceMinor)} now to confirm.</p>
		{/if}

		<input type="hidden" name="couponCode" value={coupon?.code ?? ''} />
		<button disabled={$submitting}>{$submitting ? 'Placing order…' : 'Place order'}</button>
	</aside>
</form>

<style>
	h1 {
		font-family: var(--font-display);
		font-weight: 400;
		font-size: 1.5rem;
		margin: 0 0 1.5rem;
	}

	.layout {
		display: grid;
		gap: 2rem;
	}

	@media (min-width: 56rem) {
		.layout {
			grid-template-columns: 3fr 2fr;
			align-items: start;
		}
	}

	.fields {
		display: grid;
		gap: 1.25rem;
	}

	.pair {
		display: grid;
		gap: 1.25rem;
	}

	@media (min-width: 32rem) {
		.pair {
			grid-template-columns: 1fr 1fr;
		}
	}

	label {
		display: block;
	}

	label > span {
		display: block;
		font-size: 0.875rem;
		margin-block-end: 0.375rem;
	}

	input,
	select,
	textarea {
		inline-size: 100%;
		padding: 0.75rem;
		border: 1px solid var(--c-line);
		border-radius: var(--radius);
		font: inherit;
		background: var(--c-surface);
	}

	input[type='radio'] {
		appearance: none;
		inline-size: 1.125rem;
		block-size: 1.125rem;
		flex: none;
		margin: 0.125rem 0 0;
		padding: 0;
		border: 1px solid var(--c-line);
		border-radius: 50%;
		background: var(--c-surface);
		display: inline-grid;
		place-content: center;
		cursor: pointer;
	}

	input[type='radio']::before {
		content: '';
		inline-size: 0.4375rem;
		block-size: 0.4375rem;
		border-radius: 50%;
		background: var(--c-accent-text);
		transform: scale(0);
		transition: transform 120ms cubic-bezier(0.2, 0, 0, 1);
	}

	input[type='radio']:checked {
		background: var(--c-accent);
		border-color: var(--c-accent);
	}

	input[type='radio']:checked::before {
		transform: scale(1);
	}

	input[type='radio']:focus-visible {
		outline: none;
		box-shadow: 0 0 0 2px var(--c-surface), 0 0 0 4px var(--c-accent);
	}

	select {
		appearance: none;
		padding-inline-end: 2.25rem;
		background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
		background-repeat: no-repeat;
		background-position: right 0.75rem center;
		background-size: 1rem;
		cursor: pointer;
	}

	small {
		color: var(--c-muted);
		font-size: 0.8125rem;
	}

	label small {
		display: block;
		margin-block-start: 0.25rem;
	}

	em {
		display: block;
		color: var(--c-sale);
		font-style: normal;
		font-size: 0.8125rem;
		margin-block-start: 0.25rem;
	}

	fieldset {
		border: 1px solid var(--c-line);
		border-radius: var(--radius);
		padding: 1rem;
		margin: 0;
	}

	legend {
		font-size: 0.875rem;
		padding-inline: 0.5rem;
	}

	.choice {
		display: flex;
		gap: 0.75rem;
		align-items: start;
		padding: 0.5rem 0;
	}

	.choice strong {
		font-weight: 500;
	}

	.summary {
		background: var(--c-surface);
		border: 1px solid var(--c-line);
		border-radius: var(--radius);
		padding: 1.25rem;
	}

	.summary ul {
		list-style: none;
		margin: 0 0 1rem;
		padding: 0 0 1rem;
		border-block-end: 1px solid var(--c-line);
	}

	.summary li {
		display: grid;
		grid-template-columns: auto 1fr auto;
		gap: 0.5rem;
		padding: 0.375rem 0;
		font-size: 0.9375rem;
	}

	.qty {
		color: var(--c-muted);
	}

	.name small {
		display: block;
	}

	.amt {
		font-variant-numeric: tabular-nums;
	}

	.row {
		display: flex;
		justify-content: space-between;
		padding: 0.375rem 0;
		font-size: 0.9375rem;
	}

	.row.total {
		font-size: 1.125rem;
		padding-block-start: 0.75rem;
		margin-block-start: 0.5rem;
		border-block-start: 1px solid var(--c-line);
	}

	.alert {
		background: color-mix(in oklab, var(--c-sale) 10%, var(--c-surface));
		color: var(--c-sale);
		padding: 0.75rem;
		border-radius: var(--radius);
		font-size: 0.875rem;
		margin: 0 0 1rem;
	}

	.promo {
		display: flex;
		gap: 0.5rem;
		margin-block-end: 0.75rem;
	}

	.promo > input:not([type='hidden']) {
		flex: 1;
		padding: 0.5rem 0.75rem;
		font-size: 0.875rem;
	}

	.promo button {
		inline-size: auto;
		margin: 0;
		padding: 0.5rem 1rem;
		font-size: 0.875rem;
		background: var(--c-surface);
		color: var(--c-text);
		border: 1px solid var(--c-line);
	}

	.promo-msg {
		margin: -0.25rem 0 0.75rem;
		font-size: 0.8125rem;
	}

	.promo-msg.err {
		color: var(--c-sale);
	}

	.promo-msg.ok {
		color: var(--c-accent);
	}

	.row.discount {
		color: var(--c-accent);
	}

	.advance {
		color: var(--c-muted);
		font-size: 0.875rem;
		margin: 0.75rem 0 0;
	}

	button {
		inline-size: 100%;
		margin-block-start: 1rem;
		padding: 0.875rem;
		border: 0;
		border-radius: var(--radius);
		background: var(--c-accent);
		color: var(--c-accent-text);
		font: inherit;
		font-size: 1rem;
		cursor: pointer;
	}

	button:disabled {
		opacity: 0.6;
	}
</style>
