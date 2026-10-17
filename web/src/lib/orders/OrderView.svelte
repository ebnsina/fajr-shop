<script lang="ts">
	import type { components } from '#lib/api.js';
	import { orderCopy as t, parcelCopy as pc } from '#lib/copy.js';
	import { formatMoney } from '#lib/money.js';
	import Alert from '#lib/sinaui/ui/Alert.svelte';
	import Card from '#lib/sinaui/ui/Card.svelte';
	import StatusBadge from './StatusBadge.svelte';

	// An order's lines, totals, address and timeline: the same for its customer and for the shop.
	let { order: o }: { order: components['schemas']['Order'] } = $props();

	const when = new Intl.DateTimeFormat('en-BD', {
		dateStyle: 'medium',
		timeStyle: 'short',
		timeZone: 'Asia/Dhaka'
	});
	const pct = new Intl.NumberFormat('en-BD', { style: 'percent', maximumFractionDigits: 2 });
	const rate = $derived(pct.format(o.vat_rate_bp / 10000));
	const phone = $derived(o.phone.replace(/^\+88/, ''));
</script>

<div class="order">
	<Card title={t.items} level={2}>
		<ul class="lines">
			{#each o.items as it, i (i)}
				<li>
					<span class="name">
						{#if it.product_id}<a href="/p/{it.slug}">{it.name}</a>{:else}{it.name}{/if}
						{#if Object.keys(it.options).length}<span class="muted"
								>{Object.values(it.options).join(' / ')}</span
							>{/if}
					</span>
					<span class="muted">{formatMoney(it.unit_price)} {t.qty(it.quantity)}</span>
					<strong>{formatMoney(it.line_total)}</strong>
				</li>
			{/each}
		</ul>
		<dl class="totals">
			<dt>{t.subtotal}</dt>
			<dd>{formatMoney(o.subtotal)}</dd>
			{#if o.discount_total}
				<dt>{t.discount(o.discount_code ?? '')}</dt>
				<dd>−{formatMoney(o.discount_total)}</dd>
			{/if}
			<dt>{t.delivery(o.zone_name)}</dt>
			<dd>{formatMoney(o.delivery_charge)}</dd>
			{#if o.vat_total && !o.vat_included}
				<dt>{t.vatAdded(rate)}</dt>
				<dd>{formatMoney(o.vat_total)}</dd>
			{/if}
			<dt class="total">{t.total}</dt>
			<dd class="total">{formatMoney(o.total)}</dd>
		</dl>
		{#if o.vat_total && o.vat_included}<p class="muted">
				{t.vatIncluded(rate, formatMoney(o.vat_total))}
			</p>{/if}
	</Card>

	<div class="side">
		<Card title={t.deliverTo} level={2}>
			<div class="stack">
				<p><strong>{o.customer_name}</strong></p>
				<p><a href="tel:{o.phone}">{phone}</a></p>
				{#if o.email}<p>{o.email}</p>{/if}
				<p>{o.address}<br />{o.area}, {o.district}</p>
				<p class="muted">{o.delivery_days}</p>
				{#if o.note}<Alert tone="info" title={t.customerNote}>{o.note}</Alert>{/if}
				<h3>{t.payment}</h3>
				<p>{t.cod}</p>
			</div>
		</Card>

		{#if o.shipment}
			{@const sh = o.shipment}
			<Card title={pc.title} level={2}>
				<dl class="parcel">
					<dt>{pc.with(sh.provider_name)}</dt>
					<dd>{pc.statuses[sh.status] ?? sh.status}</dd>
					{#if sh.tracking_code}
						<dt>{pc.tracking}</dt>
						<dd><code>{sh.tracking_code}</code></dd>
					{/if}
					<dt>{pc.collects}</dt>
					<dd>{formatMoney(sh.cod_amount)}</dd>
				</dl>
			</Card>
		{/if}

		<Card title={t.timeline} level={2}>
			<ol class="timeline">
				{#each o.events as e, i (i)}
					<li>
						<StatusBadge status={e.status} />
						<time datetime={e.created_at}>{when.format(new Date(e.created_at))}</time>
						{#if e.actor}<span class="muted">· {e.actor}</span>{/if}
						{#if e.note}<p>{e.note}</p>{/if}
					</li>
				{/each}
			</ol>
		</Card>
	</div>
</div>

<style>
	.order {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 22rem;
		align-items: start;
		gap: 1.25rem;
	}
	.stack {
		display: grid;
		gap: 0.375rem;
	}
	h3 {
		margin: 0.5rem 0 0;
		font-size: 0.9375rem;
	}
	.parcel {
		display: grid;
		grid-template-columns: auto 1fr;
		gap: 0.375rem 1rem;
		margin: 0;
	}
	.parcel dt {
		color: var(--text-secondary);
	}
	.parcel dd {
		margin: 0;
		text-align: end;
	}
	.parcel code {
		font-family: var(--ui-font-mono);
	}
	.side {
		display: grid;
		gap: 1.25rem;
	}
	p {
		margin: 0;
		line-height: 1.5;
	}
	ul,
	ol {
		display: grid;
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.lines li {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto auto;
		gap: 1rem;
		align-items: baseline;
		padding-block: 0.75rem;
		border-block-end: 1px solid var(--border);
		font-variant-numeric: tabular-nums;
	}
	.name {
		display: grid;
	}
	.name a {
		color: var(--text-primary);
		font-weight: 500;
	}
	.muted {
		color: var(--text-secondary);
		font-size: 0.875rem;
	}
	.totals {
		display: grid;
		grid-template-columns: 1fr auto;
		gap: 0.375rem 1rem;
		margin: 0.5rem 0 0;
		font-variant-numeric: tabular-nums;
	}
	.totals dd {
		margin: 0;
		text-align: end;
	}
	.total {
		padding-block-start: 0.5rem;
		border-block-start: 1px solid var(--border);
		font-size: 1.125rem;
		font-weight: 700;
	}
	.timeline {
		gap: 0.75rem;
	}
	.timeline li {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.375rem 0.5rem;
		font-size: 0.875rem;
	}
	.timeline p {
		flex-basis: 100%;
		color: var(--text-secondary);
	}
	time {
		color: var(--text-secondary);
	}
	a {
		color: var(--brand-700);
	}
	@media (width < 56rem) {
		.order {
			grid-template-columns: minmax(0, 1fr);
		}
	}
</style>
