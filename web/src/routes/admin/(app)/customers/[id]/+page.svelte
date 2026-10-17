<script lang="ts">
	import { customerAdmin as t, orderCopy as o } from '#lib/copy.js';
	import { formatMoney } from '#lib/money.js';
	import StatusBadge from '#lib/orders/StatusBadge.svelte';
	import Badge from '#lib/sinaui/ui/Badge.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const c = $derived(data.customer);
	const day = new Intl.DateTimeFormat('en-BD', { dateStyle: 'medium', timeZone: 'Asia/Dhaka' });
	const n = new Intl.NumberFormat('en-BD');
	const phone = $derived(c.phone?.replace(/^\+88/, '') ?? '');
</script>

<svelte:head><title>{c.name} · {data.store.name}</title></svelte:head>

<a class="back" href="/admin/customers">← {t.back}</a>
<div class="head">
	<h1>{c.name}</h1>
	{#if c.disabled}<Badge tone="warning">{t.disabled}</Badge>{/if}
</div>

<ul class="facts">
	<li><span class="v">{n.format(c.order_count)}</span><span class="l">{t.orders}</span></li>
	<li><span class="v">{formatMoney(c.spent)}</span><span class="l">{t.spent}</span></li>
	<li>
		<span class="v">{c.last_order_at ? day.format(new Date(c.last_order_at)) : '—'}</span>
		<span class="l">{t.lastOrder}</span>
	</li>
	<li>
		<span class="v">{day.format(new Date(c.created_at))}</span><span class="l">{t.joined}</span>
	</li>
</ul>

<div class="grid">
	<section class="card">
		<h2>{t.contact}</h2>
		{#if c.phone}<p><a href="tel:{c.phone}">{phone}</a></p>{/if}
		{#if c.email}<p><a href="mailto:{c.email}">{c.email}</a></p>{/if}
	</section>
	<section class="card">
		<h2>{t.orders}</h2>
		{#if c.orders.length}
			<ul class="orders">
				{#each c.orders as x (x.id)}
					<li>
						<a href="/admin/orders/{x.number}">{o.number(x.number)}</a>
						<StatusBadge status={x.status} />
						<span class="muted">{day.format(new Date(x.created_at))} · {x.district}</span>
						<strong>{formatMoney(x.total)}</strong>
					</li>
				{/each}
			</ul>
		{:else}
			<p class="muted">{t.noOrders}</p>
		{/if}
	</section>
</div>

<style>
	.back {
		display: inline-block;
		margin-block-end: 0.75rem;
		color: var(--brand-700);
		font-size: 0.875rem;
	}
	.head {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}
	.facts {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
		gap: 1rem;
		margin: 1rem 0 1.5rem;
		padding: 0;
		list-style: none;
	}
	.facts li,
	.card {
		display: grid;
		gap: 0.25rem;
		padding: 1rem 1.25rem;
		border-radius: var(--ui-radius);
		background: var(--ui-surface);
		box-shadow: var(--ui-shadow-card);
	}
	.v {
		font-size: 1.25rem;
		font-weight: 700;
		font-variant-numeric: tabular-nums;
	}
	.l,
	.muted {
		color: var(--text-secondary);
		font-size: 0.875rem;
	}
	.grid {
		display: grid;
		grid-template-columns: minmax(0, 18rem) minmax(0, 1fr);
		align-items: start;
		gap: 1rem;
	}
	h2 {
		margin: 0 0 0.5rem;
		font-size: 1rem;
	}
	p {
		margin: 0;
	}
	a {
		color: var(--brand-700);
	}
	.orders {
		display: grid;
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.orders li {
		display: grid;
		grid-template-columns: auto auto 1fr auto;
		align-items: center;
		gap: 0.75rem;
		padding-block: 0.625rem;
		border-block-end: 1px solid var(--border);
	}
	.orders a {
		font-weight: 600;
	}
	.orders strong {
		font-variant-numeric: tabular-nums;
	}
	@media (width < 48rem) {
		.grid {
			grid-template-columns: minmax(0, 1fr);
		}
	}
</style>
