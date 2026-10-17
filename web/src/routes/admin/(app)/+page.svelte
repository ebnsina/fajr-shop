<script lang="ts">
	import {
		ChartLineData01Icon,
		Clock01Icon,
		CubeIcon,
		DeliveryTruck01Icon,
		Money03Icon,
		FolderTreeIcon,
		PackageRemoveIcon,
		PencilEdit02Icon
	} from '@hugeicons/core-free-icons';
	import Icon from '#lib/sinaui/ui/Icon.svelte';
	import { barY, defineChart } from '@tanstack/charts';
	import { scaleBand } from '@tanstack/charts/scales/band';
	import { scaleLinear } from '@tanstack/charts/scales/linear';
	import { tooltip } from '@tanstack/charts/tooltip';
	import RowMenu from '#lib/admin/RowMenu.svelte';
	import StatusBadge from '#lib/orders/StatusBadge.svelte';
	import Chart from '#lib/sinaui/ui/Chart.svelte';
	import { formatMoney } from '#lib/money.js';
	import { orderCopy as oc, overview as t } from '#lib/copy.js';
	import { describe } from '#lib/admin/activity.js';
	import Button from '#lib/sinaui/ui/Button.svelte';
	import EmptyState from '#lib/sinaui/ui/EmptyState.svelte';
	import Table from '#lib/sinaui/ui/Table.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const dhaka = { timeZone: 'Asia/Dhaka' } as const;
	const today = new Intl.DateTimeFormat('en-BD', { ...dhaka, dateStyle: 'full' }).format(
		new Date()
	);
	const hour = Number(
		new Intl.DateTimeFormat('en-GB', { ...dhaka, hour: 'numeric', hourCycle: 'h23' }).format(
			new Date()
		)
	);
	const partOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
	const short = new Intl.DateTimeFormat('en-BD', {
		day: 'numeric',
		month: 'short',
		timeZone: 'UTC'
	});
	// One bar per day, in taka.
	const chart = $derived.by(() => {
		const days = data.overview.orders?.days;
		if (!days?.length) return null;
		const rows = days.map((d) => ({ day: short.format(new Date(d.day)), sales: d.sales / 100 }));
		return defineChart({
			marks: [barY(rows, { x: 'day', y: 'sales', radius: 4 })],
			scales: {
				x: { scale: () => scaleBand<string>().padding(0.3), axis: { label: t.day } },
				y: {
					scale: scaleLinear,
					nice: true,
					grid: true,
					axis: { label: t.sales, ticks: { count: 4 } }
				}
			},
			tooltip
		});
	});
	const weekTotal = $derived((data.overview.orders?.days ?? []).reduce((a, d) => a + d.sales, 0));
	const weekOrders = $derived((data.overview.orders?.days ?? []).reduce((a, d) => a + d.orders, 0));
	const o = $derived(data.overview);
	const n = new Intl.NumberFormat('en-BD');
	const when = new Intl.DateTimeFormat('en-BD', {
		dateStyle: 'medium',
		timeStyle: 'short',
		timeZone: 'Asia/Dhaka'
	});
	type Stat = { label: string; value: string; icon: typeof CubeIcon; href: string; warn?: boolean };
	// Orders first, for whoever handles them: what's waiting, then how sales are going.
	const orderStats = $derived<Stat[]>(
		o.orders
			? [
					{
						label: t.waiting,
						value: n.format(o.orders.waiting),
						icon: Clock01Icon,
						href: '/admin/orders?status=pending',
						warn: o.orders.waiting > 0
					},
					{
						label: t.toShip,
						value: n.format(o.orders.to_ship),
						icon: DeliveryTruck01Icon,
						href: '/admin/orders?status=confirmed'
					},
					{
						label: t.today(o.orders.today_orders),
						value: formatMoney(o.orders.today_sales),
						icon: Money03Icon,
						href: '/admin/orders'
					},
					{
						label: t.week(o.orders.week_orders),
						value: formatMoney(o.orders.week_sales),
						icon: ChartLineData01Icon,
						href: '/admin/orders'
					}
				]
			: []
	);
	const stats = $derived<Stat[]>([
		{
			label: t.forSale,
			value: n.format(o.products.active),
			icon: CubeIcon,
			href: '/admin/products?status=active'
		},
		{
			label: t.drafts,
			value: n.format(o.products.draft),
			icon: PencilEdit02Icon,
			href: '/admin/products?status=draft'
		},
		{
			label: t.soldOut,
			value: n.format(o.out_of_stock),
			icon: PackageRemoveIcon,
			href: '/admin/products',
			warn: o.out_of_stock > 0
		},
		{
			label: t.categories,
			value: n.format(o.categories),
			icon: FolderTreeIcon,
			href: '/admin/categories'
		}
	]);
</script>

<svelte:head><title>{t.title} · {data.store.name}</title></svelte:head>

<div class="hello">
	<div>
		<h1>{t.greeting(partOfDay, data.user.name)}</h1>
		<p>{t.description}</p>
	</div>
	<div class="right">
		<time datetime={new Date().toISOString().slice(0, 10)}>{today}</time>
		<div class="actions">
			<Button variant="secondary" href="/admin/banners">{t.addBanner}</Button>
			<Button href="/admin/products/new">{t.addProduct}</Button>
		</div>
	</div>
</div>

<ul class="stats">
	{#each [...orderStats, ...stats] as s (s.label)}
		<li class={[s.warn && 'warn']}>
			<svelte:element this={s.href ? 'a' : 'div'} href={s.href} class="stat">
				<span class="icon"><Icon icon={s.icon} size={20} /></span>
				<span class="value">{s.value}</span>
				<span class="label">{s.label}</span>
			</svelte:element>
		</li>
	{/each}
</ul>

<div class="grid">
	<div class="col">
		{#if o.orders && chart}
			<section class="panel">
				<Chart
					title={t.salesChart}
					description={t.salesChartAbout(formatMoney(weekTotal), weekOrders)}
					definition={chart}
					height={260}
				/>
			</section>
		{/if}
		{#if data.orders}
			<section class="panel" aria-labelledby="latest">
				<div class="panel-head">
					<h2 id="latest">{t.latestOrders}</h2>
					<a href="/admin/orders">{t.allOrders}</a>
				</div>
				{#if data.orders.length}
					<table class="orders">
						<tbody>
							{#each data.orders as x (x.id)}
								<tr>
									<td><a href="/admin/orders/{x.number}">#{x.number}</a></td>
									<td
										>{x.customer_name}<span class="opt"
											>{x.phone.replace(/^\+88/, '')} · {x.district}</span
										></td
									>
									<td class="num">{formatMoney(x.total)}</td>
									<td><StatusBadge status={x.status} /></td>
									<td class="menu"
										><RowMenu
											label={oc.number(x.number)}
											actions={[
												{ label: t.view, href: `/admin/orders/${x.number}` },
												{ label: t.call, href: `tel:${x.phone}` }
											]}
										/></td
									>
								</tr>
							{/each}
						</tbody>
					</table>
				{:else}
					<EmptyState title={t.noOrders} />
				{/if}
			</section>
		{/if}
	</div>
	<div class="col">
		<section class="panel" aria-labelledby="low">
			<h2 id="low">{t.lowStock}</h2>
			{#if o.low_stock.length}
				<Table caption={t.lowStock} hideCaption>
					<thead><tr><th>{t.product}</th><th class="num">{t.left}</th></tr></thead>
					<tbody>
						{#each o.low_stock as l (l.variant_id)}
							<tr>
								<td>
									<a href="/admin/products/{l.product_id}">{l.name}</a>
									{#if Object.keys(l.options).length}<span class="opt"
											>{Object.values(l.options).join(' / ')}</span
										>{/if}
								</td>
								<td class="num">{l.stock}</td>
							</tr>
						{/each}
					</tbody>
				</Table>
			{:else}
				<EmptyState title={t.lowStockNone} />
			{/if}
		</section>
		{#if data.activity}
			<section class="panel" aria-labelledby="recent">
				<div class="panel-head">
					<h2 id="recent">{t.recent}</h2>
					<a href="/admin/activity">{t.allActivity}</a>
				</div>
				{#if data.activity.length}
					<ul class="feed">
						{#each data.activity as e (e.id)}{@const d = describe(e)}
							<li>
								<span
									>{#if d.href}<a href={d.href}>{d.text}</a>{:else}{d.text}{/if}</span
								>
								<span class="meta"
									>{e.actor ?? t.system} · {when.format(new Date(e.created_at))}</span
								>
							</li>
						{/each}
					</ul>
				{:else}
					<EmptyState title={t.recentNone} />
				{/if}
			</section>
		{/if}
	</div>
</div>

<style>
	.hello {
		display: flex;
		flex-wrap: wrap;
		align-items: end;
		justify-content: space-between;
		gap: 1rem;
		margin-block-end: 1.5rem;
	}
	.hello h1 {
		margin: 0 0 0.25rem;
		font-size: 1.625rem;
	}
	.hello p {
		margin: 0;
		color: var(--text-secondary);
	}
	.right {
		display: grid;
		justify-items: end;
		gap: 0.625rem;
	}
	time {
		color: var(--text-secondary);
		font-weight: 500;
	}
	.actions {
		display: flex;
		gap: 0.5rem;
	}
	/* Four across; two on a tablet, one on a phone. */
	.stats {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: 1rem;
		margin: 0 0 1.5rem;
		padding: 0;
		list-style: none;
	}
	.stat {
		display: grid;
		grid-template-columns: auto 1fr;
		grid-template-rows: auto auto;
		column-gap: 0.75rem;
		align-items: center;
		block-size: 100%;
		box-sizing: border-box;
		padding: 1rem 1.25rem;
		border-radius: var(--ui-radius);
		background: var(--ui-surface);
		box-shadow: var(--ui-shadow-card);
		color: var(--ui-fg);
		text-decoration: none;
	}
	a.stat:hover {
		outline: 1px solid var(--ui-accent);
	}
	.icon {
		display: grid;
		grid-row: span 2;
		place-items: center;
		inline-size: 2.5rem;
		block-size: 2.5rem;
		border-radius: var(--ui-radius-control);
		background: color-mix(in srgb, var(--ui-accent) 12%, transparent);
		color: var(--ui-accent);
	}
	.warn .icon {
		background: color-mix(in srgb, var(--ui-warning) 14%, transparent);
		color: var(--ui-warning);
	}
	.value {
		font-size: 1.5rem;
		font-weight: 700;
		font-variant-numeric: tabular-nums;
		line-height: 1.1;
	}
	.label {
		color: var(--ui-muted);
		font-size: 0.8125rem;
	}
	/* Two columns that stack on their own, so a tall panel never leaves a gap beside it. */
	.grid {
		display: grid;
		grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
		gap: 1.5rem;
		align-items: start;
	}
	.col {
		display: grid;
		gap: 1.5rem;
	}
	.orders {
		inline-size: 100%;
		border-collapse: collapse;
		font-size: 0.875rem;
	}
	.orders td {
		padding: 0.625rem 0.5rem;
		border-block-end: 1px solid var(--border);
		vertical-align: middle;
	}
	.orders tr:last-child td {
		border-block-end: 0;
	}
	.orders a {
		color: var(--brand-700);
		font-weight: 600;
	}
	.orders .num {
		text-align: end;
		font-variant-numeric: tabular-nums;
	}
	.menu {
		inline-size: 1%;
	}
	@media (width < 72rem) {
		.stats {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
		.grid {
			grid-template-columns: minmax(0, 1fr);
		}
	}
	@media (width < 36rem) {
		.stats {
			grid-template-columns: minmax(0, 1fr);
		}
		.right {
			justify-items: start;
		}
	}
	.panel {
		padding: 1.25rem;
		border-radius: var(--ui-radius);
		background: var(--ui-surface);
		box-shadow: var(--ui-shadow-card);
	}
	.panel h2 {
		margin: 0 0 0.75rem;
		font-size: 1rem;
	}
	.panel-head {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
	}
	.opt {
		display: block;
		color: var(--ui-muted);
		font-size: 0.8125rem;
	}
	.feed {
		display: grid;
		gap: 0.75rem;
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.feed li {
		display: grid;
		gap: 0.125rem;
	}
	.meta {
		color: var(--ui-muted);
		font-size: 0.8125rem;
	}
</style>
