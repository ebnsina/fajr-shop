<script lang="ts">
	import { enhance } from '$app/forms';
	import { formatMoney } from '$lib/money';

	let { data, form } = $props();

	const LABEL: Record<string, string> = {
		pending: 'Waiting for confirmation',
		confirmed: 'Confirmed',
		processing: 'Being packed',
		shipped: 'On the way',
		delivered: 'Delivered',
		cancelled: 'Cancelled',
		returned: 'Returned'
	};
</script>


<div class="wrap">
	<h1>Track your order</h1>
	<p class="lead">No account needed — just your order code and phone number.</p>

	<form method="POST" use:enhance>
		<input name="code" placeholder="Order code" required />
		<input name="phone" type="tel" inputmode="numeric" placeholder="01XXXXXXXXX" required />
		<button>Find it</button>
	</form>

	{#if form?.error}
		<p class="err" role="alert">{form.error}</p>
	{/if}

	{#if form?.order}
		<div class="card">
			<p class="status">{LABEL[form.order.status] ?? form.order.status}</p>
			<p class="code">{form.order.publicCode}</p>
			<ul>
				{#each form.order.items as item (item.title + item.variantTitle)}
					<li>{item.qty}× {item.title}{item.variantTitle ? ` · ${item.variantTitle}` : ''}</li>
				{/each}
			</ul>
			<p class="total">{formatMoney(form.order.totalMinor, data.store.currency)}</p>
			<a href="/order/{form.order.publicCode}?p={encodeURIComponent(form.phone)}">Full details →</a>
		</div>
	{/if}
</div>

<style>
	.wrap {
		max-inline-size: 30rem;
		margin-inline: auto;
	}

	h1 {
		font-family: var(--font-display);
		font-weight: 400;
		font-size: 1.5rem;
		margin: 0 0 0.25rem;
	}

	.lead {
		color: var(--c-muted);
		margin: 0 0 1.5rem;
	}

	form {
		display: grid;
		gap: 0.75rem;
	}

	input {
		padding: 0.75rem;
		border: 1px solid var(--c-line);
		border-radius: var(--radius);
		font: inherit;
	}

	button {
		padding: 0.75rem;
		border: 0;
		border-radius: var(--radius);
		background: var(--c-accent);
		color: var(--c-accent-text);
		font: inherit;
		cursor: pointer;
	}

	.err {
		color: var(--c-sale);
		font-size: 0.9375rem;
	}

	.card {
		margin-block-start: 1.5rem;
		background: var(--c-surface);
		border: 1px solid var(--c-line);
		border-radius: var(--radius);
		padding: 1.25rem;
	}

	.status {
		font-size: 1.125rem;
		margin: 0;
	}

	.code {
		color: var(--c-muted);
		font-size: 0.875rem;
		margin: 0.25rem 0 1rem;
	}

	.card ul {
		list-style: none;
		margin: 0 0 0.75rem;
		padding: 0;
		font-size: 0.9375rem;
	}

	.total {
		margin: 0 0 0.75rem;
	}

	.card a {
		color: var(--c-accent);
		font-size: 0.875rem;
	}
</style>
