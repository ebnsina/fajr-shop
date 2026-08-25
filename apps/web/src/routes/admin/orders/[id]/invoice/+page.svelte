<script lang="ts">
	import { minorToTaka } from '@fajr/schemas';

	let { data } = $props();
	const o = $derived(data.order);

	const taka = (m: number) => `৳${minorToTaka(m)}`;
	const when = (d: Date | string) =>
		new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Dhaka' })
			.format(new Date(d));

	const due = $derived(o.totalMinor - o.paidMinor);
</script>

<svelte:head>
	<title>Invoice {o.publicCode}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<!-- One sheet: invoice on top, packing slip below the fold line. Staff print
     once and the courier gets both. -->
<article class="sheet">
	<header>
		<div>
			<h1>{data.store.name}</h1>
			{#if data.store.phone}<p>{data.store.phone}</p>{/if}
			{#if data.store.vatRegistered && data.store.vatBin}
				<p>BIN: {data.store.vatBin}</p>
			{/if}
		</div>
		<div class="meta">
			<p class="doc">{data.store.vatRegistered ? 'VAT Invoice · Mushak 6.3' : 'Invoice'}</p>
			<p class="code">{o.publicCode}</p>
			<p>{when(o.placedAt)}</p>
		</div>
	</header>

	<section class="to">
		<h2>Deliver to</h2>
		{#if o.address}
			<p>
				<strong>{o.address.name}</strong><br />
				{o.address.phoneE164}<br />
				{o.address.detail}<br />
				{[o.address.area, o.address.thana, o.address.district].filter(Boolean).join(', ')}
			</p>
		{/if}
	</section>

	<table>
		<thead>
			<tr><th>Item</th><th class="num">Qty</th><th class="num">Price</th><th class="num">Amount</th></tr>
		</thead>
		<tbody>
			{#each o.items as item (item.id)}
				<tr>
					<td>{item.title}{item.variantTitle ? ` · ${item.variantTitle}` : ''}</td>
					<td class="num">{item.qty}</td>
					<td class="num">{taka(item.unitPriceMinor)}</td>
					<td class="num">{taka(item.totalMinor)}</td>
				</tr>
			{/each}
		</tbody>
		<tfoot>
			<tr><td colspan="3">Subtotal</td><td class="num">{taka(o.subtotalMinor)}</td></tr>
			<tr><td colspan="3">Delivery</td><td class="num">{taka(o.shippingMinor)}</td></tr>
			{#if data.store.vatRegistered && o.taxMinor > 0}
				<tr><td colspan="3">VAT</td><td class="num">{taka(o.taxMinor)}</td></tr>
			{/if}
			<tr class="total"><td colspan="3">Total</td><td class="num">{taka(o.totalMinor)}</td></tr>
			{#if o.paidMinor > 0}
				<tr><td colspan="3">Paid in advance</td><td class="num">−{taka(o.paidMinor)}</td></tr>
			{/if}
			<tr class="due"><td colspan="3">Collect on delivery</td><td class="num">{taka(due)}</td></tr>
		</tfoot>
	</table>

	<p class="fold">— — — — — — — — — — — — — — — — — — — — — — — — — — — — — —</p>

	<section class="slip">
		<h2>Packing slip · {o.publicCode}</h2>
		<ul>
			{#each o.items as item (item.id)}
				<li>
					<span class="box"></span>
					<strong>{item.qty}×</strong>
					{item.title}{item.variantTitle ? ` · ${item.variantTitle}` : ''}
					{#if item.sku}<code>{item.sku}</code>{/if}
				</li>
			{/each}
		</ul>
		{#if o.note}<p class="note">Note: {o.note}</p>{/if}
		<p class="cod">Collect: <strong>{taka(due)}</strong></p>
	</section>

	<button class="print" onclick={() => window.print()}>Print</button>
</article>

<style>
	:global(body) {
		background: #fff;
	}

	.sheet {
		max-inline-size: 48rem;
		margin-inline: auto;
		padding: 2rem;
		font-size: 0.875rem;
		color: #111;
	}

	header {
		display: flex;
		justify-content: space-between;
		gap: 2rem;
		padding-block-end: 1rem;
		border-block-end: 2px solid #111;
	}

	h1 {
		font-size: 1.25rem;
		margin: 0 0 0.25rem;
	}

	header p {
		margin: 0;
		color: #555;
	}

	.meta {
		text-align: end;
	}

	.doc {
		font-weight: 600;
		color: #111 !important;
	}

	.code {
		font-size: 1.125rem;
		font-family: ui-monospace, monospace;
	}

	.to {
		margin-block: 1.5rem;
	}

	h2 {
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: #666;
		margin: 0 0 0.5rem;
	}

	.to p {
		margin: 0;
		line-height: 1.6;
	}

	table {
		inline-size: 100%;
		border-collapse: collapse;
	}

	th,
	td {
		padding: 0.5rem 0;
		text-align: start;
		border-block-end: 1px solid #eee;
	}

	th {
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: #666;
	}

	.num {
		text-align: end;
		font-variant-numeric: tabular-nums;
	}

	tfoot td {
		border: 0;
		padding: 0.125rem 0;
	}

	tfoot .total td {
		font-weight: 600;
		padding-block-start: 0.5rem;
		border-block-start: 1px solid #111;
	}

	tfoot .due td {
		font-weight: 600;
		font-size: 1rem;
		padding-block-start: 0.375rem;
	}

	.fold {
		text-align: center;
		color: #bbb;
		margin-block: 2rem;
		letter-spacing: 0.1em;
	}

	.slip ul {
		list-style: none;
		margin: 0;
		padding: 0;
	}

	.slip li {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.375rem 0;
		border-block-end: 1px dashed #ddd;
	}

	/* A box to tick while packing — the slip is a working document. */
	.box {
		inline-size: 0.875rem;
		block-size: 0.875rem;
		border: 1px solid #999;
		flex: none;
	}

	code {
		font-size: 0.75rem;
		color: #666;
	}

	.note {
		margin-block-start: 0.75rem;
		padding: 0.5rem;
		background: #f6f6f6;
	}

	.cod {
		margin-block-start: 0.75rem;
		font-size: 1rem;
	}

	.print {
		margin-block-start: 2rem;
		padding: 0.5rem 1rem;
		border: 1px solid #111;
		background: #fff;
		font: inherit;
		cursor: pointer;
	}

	@media print {
		.print {
			display: none;
		}
		.sheet {
			padding: 0;
		}
	}
</style>
