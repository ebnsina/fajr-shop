<script lang="ts">
	import { enhance } from '$app/forms';
	import { moneyFor } from '$lib/money';

	let { data, form } = $props();
	const money = $derived(moneyFor({ currency: data.store.currency, locale: data.store.numberLocale }));

	const owed = $derived(data.order.advanceMinor - data.order.paidMinor);
	const needsPayment = $derived(owed > 0 && data.order.paymentStatus !== 'paid');
</script>


<div class="wrap">
	<p class="tick">✓</p>
	<h1>Thank you</h1>
	<p class="lead">
		Order <strong>{data.order.publicCode}</strong> is placed. We'll call
		{data.phone} to confirm.
	</p>

	<div class="card">
		<ul>
			{#each data.order.items as item (item.title + item.variantTitle)}
				<li>
					<span>{item.qty}× {item.title}{item.variantTitle ? ` · ${item.variantTitle}` : ''}</span>
				</li>
			{/each}
		</ul>
		<div class="row total"><span>Total</span><span>{money(data.order.totalMinor)}</span></div>
	</div>

	{#if needsPayment}
		<div class="card pay">
			<h2>{data.order.paymentMethod === 'bkash_manual' ? 'Pay with bKash' : 'Confirm with an advance'}</h2>
			<p>
				Send <strong>{money(owed)}</strong> to our bKash number, then enter the transaction ID below.
				{#if data.order.paymentMethod === 'cod'}
					The rest is paid to the courier on delivery.
				{/if}
			</p>

			{#if form?.submitted}
				<p class="ok">Got it. We'll verify and confirm your order shortly.</p>
			{:else}
				<form method="POST" action="?p={encodeURIComponent(data.phone)}&/pay" use:enhance>
					<input type="hidden" name="phone" value={data.phone} />
					<input name="reference" placeholder="Transaction ID, e.g. BKA7X2QP1M" required />
					<button>Submit</button>
				</form>
				{#if form?.error}<p class="err">{form.error}</p>{/if}
			{/if}
		</div>
	{/if}

	<p class="save">
		Save this link to check your order any time, or
		<a href="/track">track it with your phone number</a>.
	</p>
</div>

<style>
	.wrap {
		max-inline-size: 34rem;
		margin-inline: auto;
		text-align: center;
	}

	.tick {
		font-size: 2rem;
		color: var(--c-accent);
		margin: 1rem 0 0;
	}

	h1 {
		font-family: var(--font-display);
		font-weight: 400;
		font-size: 1.75rem;
		margin: 0.5rem 0;
	}

	.lead {
		color: var(--c-muted);
		margin: 0 0 2rem;
	}

	.card {
		background: var(--c-surface);
		border: 1px solid var(--c-line);
		border-radius: var(--radius);
		padding: 1.25rem;
		text-align: start;
		margin-block-end: 1rem;
	}

	.card ul {
		list-style: none;
		margin: 0 0 0.75rem;
		padding: 0;
	}

	.card li {
		padding: 0.25rem 0;
		font-size: 0.9375rem;
	}

	.row {
		display: flex;
		justify-content: space-between;
		padding-block-start: 0.75rem;
		border-block-start: 1px solid var(--c-line);
	}

	.pay h2 {
		font-size: 1rem;
		margin: 0 0 0.5rem;
	}

	.pay p {
		color: var(--c-muted);
		font-size: 0.9375rem;
		margin: 0 0 1rem;
	}

	.pay form {
		display: flex;
		gap: 0.5rem;
	}

	input {
		flex: 1;
		padding: 0.75rem;
		border: 1px solid var(--c-line);
		border-radius: var(--radius);
		font: inherit;
	}

	button {
		padding: 0.75rem 1.25rem;
		border: 0;
		border-radius: var(--radius);
		background: var(--c-accent);
		color: var(--c-accent-text);
		font: inherit;
		cursor: pointer;
	}

	.ok {
		color: var(--c-accent);
	}

	.err {
		color: var(--c-sale);
		font-size: 0.875rem;
	}

	.save {
		color: var(--c-muted);
		font-size: 0.875rem;
	}
</style>
