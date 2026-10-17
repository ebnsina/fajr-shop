<script lang="ts">
	import type { components } from '#lib/api.js';
	import { orderCopy as t } from '#lib/copy.js';
	import { formatMoney } from '#lib/money.js';
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
	<section class="card lines" aria-labelledby="items-{o.number}">
		<h2 id="items-{o.number}">{t.items}</h2>
		<ul>
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
	</section>

	<div class="side">
		<section class="card" aria-labelledby="to-{o.number}">
			<h2 id="to-{o.number}">{t.deliverTo}</h2>
			<p><strong>{o.customer_name}</strong></p>
			<p><a href="tel:{o.phone}">{phone}</a></p>
			{#if o.email}<p>{o.email}</p>{/if}
			<p>{o.address}<br />{o.area}, {o.district}</p>
			<p class="muted">{o.delivery_days}</p>
			{#if o.note}<p class="note">{o.note}</p>{/if}
			<h2>{t.payment}</h2>
			<p>{t.cod}</p>
		</section>

		<section class="card" aria-labelledby="tl-{o.number}">
			<h2 id="tl-{o.number}">{t.timeline}</h2>
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
		</section>
	</div>
</div>

<style>
	.order {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 22rem;
		align-items: start;
		gap: 1.25rem;
	}
	.side {
		display: grid;
		gap: 1.25rem;
	}
	.card {
		display: grid;
		gap: 0.5rem;
		padding: 1.25rem;
		border: 1px solid var(--border);
		border-radius: calc(var(--ui-radius) * 1.5);
		background: var(--bg-surface);
	}
	h2 {
		margin: 0;
		font-size: 1rem;
		font-weight: 600;
	}
	h2:not(:first-child) {
		margin-block-start: 0.5rem;
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
	.note {
		padding: 0.5rem 0.75rem;
		border-radius: var(--ui-radius-control);
		background: var(--bg-subtle);
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
