<script lang="ts">
	import { enhance } from '$app/forms';
	import { formatMoney } from '$lib/money';

	let { data, form } = $props();
	const money = (m: number) => formatMoney(m, data.store.currency);
</script>


<h1>Your bag</h1>

{#if form?.error}
	<p class="error" role="alert">{form.error}</p>
{/if}

{#if data.cart.lines.length === 0}
	<p class="empty">Your bag is empty. <a href="/">Keep shopping</a></p>
{:else}
	<ul class="lines">
		{#each data.cart.lines as line (line.id)}
			<li>
				<a href="/products/{line.slug}" class="thumb">
					{#if line.imageUrl}
						<img src={line.imageUrl} alt="" />
					{:else}
						<span class="placeholder"></span>
					{/if}
				</a>

				<div class="info">
					<a href="/products/{line.slug}">{line.title}</a>
					{#if line.variantTitle}<p class="variant">{line.variantTitle}</p>{/if}
					<p class="unit">{money(line.unitPriceMinor)}</p>
				</div>

				<form method="POST" action="?/qty" use:enhance class="qty">
					<input type="hidden" name="itemId" value={line.id} />
					<label class="sr-only" for="q-{line.id}">Quantity</label>
					<input
						id="q-{line.id}"
						name="qty"
						type="number"
						min="1"
						max={line.allowBackorder ? 99 : line.available}
						value={line.qty}
						onchange={(e) => e.currentTarget.form?.requestSubmit()}
					/>
				</form>

				<p class="total">{money(line.totalMinor)}</p>

				<form method="POST" action="?/remove" use:enhance>
					<input type="hidden" name="itemId" value={line.id} />
					<button class="remove" aria-label="Remove {line.title}">×</button>
				</form>
			</li>
		{/each}
	</ul>

	<div class="summary">
		<div class="row"><span>Subtotal</span><span>{money(data.cart.subtotalMinor)}</span></div>
		<div class="row muted"><span>Delivery</span><span>Calculated at checkout</span></div>
		<a class="cta" href="/checkout">Checkout</a>
		<p class="cod">Cash on delivery available across Bangladesh.</p>
	</div>
{/if}

<style>
	h1 {
		font-family: var(--font-display);
		font-weight: 400;
		font-size: 1.5rem;
		margin: 0 0 1.5rem;
	}

	.error {
		background: color-mix(in oklab, var(--c-sale) 12%, var(--c-surface));
		color: var(--c-sale);
		padding: 0.75rem 1rem;
		border-radius: var(--radius);
	}

	.empty {
		color: var(--c-muted);
	}

	.lines {
		list-style: none;
		margin: 0;
		padding: 0;
		border-block-start: 1px solid var(--c-line);
	}

	.lines li {
		display: grid;
		grid-template-columns: 5rem 1fr auto auto auto;
		gap: 1rem;
		align-items: center;
		padding: 1rem 0;
		border-block-end: 1px solid var(--c-line);
	}

	.thumb img,
	.placeholder {
		inline-size: 5rem;
		aspect-ratio: var(--card-aspect);
		object-fit: cover;
		display: block;
		border-radius: var(--radius);
		background: var(--c-line);
	}

	.info a {
		color: inherit;
		text-decoration: none;
	}

	.variant,
	.unit {
		color: var(--c-muted);
		font-size: 0.875rem;
		margin: 0.25rem 0 0;
	}

	.qty input {
		inline-size: 4rem;
		padding: 0.375rem 0.5rem;
		border: 1px solid var(--c-line);
		border-radius: var(--radius);
		font: inherit;
		text-align: center;
	}

	.total {
		margin: 0;
		min-inline-size: 6rem;
		text-align: end;
		font-variant-numeric: tabular-nums;
	}

	.remove {
		border: 0;
		background: none;
		color: var(--c-muted);
		font-size: 1.25rem;
		cursor: pointer;
		padding: 0 0.5rem;
	}

	.summary {
		margin-block-start: 2rem;
		margin-inline-start: auto;
		max-inline-size: 22rem;
	}

	.row {
		display: flex;
		justify-content: space-between;
		padding: 0.5rem 0;
	}

	.row.muted {
		color: var(--c-muted);
		font-size: 0.875rem;
	}

	.cta {
		display: block;
		margin-block-start: 1rem;
		padding: 0.875rem;
		text-align: center;
		background: var(--c-accent);
		color: var(--c-accent-text);
		border-radius: var(--radius);
		text-decoration: none;
	}

	.cod {
		color: var(--c-muted);
		font-size: 0.8125rem;
		text-align: center;
		margin: 0.75rem 0 0;
	}

	.sr-only {
		position: absolute;
		inline-size: 1px;
		block-size: 1px;
		overflow: hidden;
		clip-path: inset(50%);
	}
</style>
