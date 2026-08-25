<script lang="ts">
	import { goto } from '$app/navigation';
	import { minorToTaka } from '@fajr/schemas';

	let { data } = $props();

	const taka = (m: number) => `৳${minorToTaka(m)}`;
	const pct = (n: number) => `${Math.round(n * 1000) / 10}%`;

	// A rate with no observations is not zero, it is unknown. Printing 0% next to an empty week is
	// the same lie as counting cancelled orders as revenue.
	const rate = (n: number, sample: number) => (sample > 0 ? pct(n) : '—');

	const attempted = $derived(data.cod.delivered + data.cod.returned);

	const RANGES = [
		['7d', '7 days'],
		['30d', '30 days'],
		['90d', '90 days']
	] as const;

	/** Bars, not a chart library: a sparkline of daily revenue is all this needs. */
	const peak = $derived(Math.max(1, ...data.sales.byDay.map((d) => d.revenueMinor)));

	const day = (iso: string) =>
		new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' }).format(new Date(iso));
</script>

<svelte:head><title>Reports · Fajr Shop</title></svelte:head>

<div class="flex flex-wrap items-center justify-between gap-4">
	<div>
		<h1 class="text-xl font-semibold tracking-tight text-strong">Reports</h1>
		<p class="mt-1 text-sm text-muted">Last {data.days} days. Cancelled orders are never counted as revenue.</p>
	</div>

	<div class="flex gap-1">
		{#each RANGES as [key, label] (key)}
			<button
				onclick={() => goto(`?range=${key}`, { noScroll: true })}
				class="rounded-xl px-3 py-1.5 text-sm transition {data.range === key ? 'bg-strong text-raised' : 'text-muted hover:bg-hover'}"
			>
				{label}
			</button>
		{/each}
	</div>
</div>

<!-- headline -->
<section class="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
	{#each [['Revenue', taka(data.sales.revenueMinor)], ['Orders', String(data.sales.orders)], ['Average order', taka(data.sales.averageOrderMinor)], ['Items sold', String(data.sales.itemsSold)]] as [label, value] (label)}
		<div class="card !p-5">
			<p class="text-sm text-muted">{label}</p>
			<p class="mt-2 font-mono text-2xl tabular-nums text-strong">{value}</p>
		</div>
	{/each}
</section>

<!-- daily revenue -->
{#if data.sales.byDay.length > 1}
	<section class="card mt-6 !p-5">
		<h2 class="mb-4 text-sm font-medium text-body">Daily revenue</h2>
		<div class="flex h-32 items-end gap-1">
			{#each data.sales.byDay as d (d.day)}
				<div
					class="flex-1 rounded-t bg-primary-500/80 transition hover:bg-primary-600"
					style="height: {Math.max(2, (d.revenueMinor / peak) * 100)}%"
					title="{day(d.day)} · {taka(d.revenueMinor)} · {d.orders} orders"
				></div>
			{/each}
		</div>
		<div class="mt-2 flex justify-between text-xs text-muted">
			<span>{day(data.sales.byDay[0]!.day)}</span>
			<span>{day(data.sales.byDay.at(-1)!.day)}</span>
		</div>
	</section>
{/if}

<div class="mt-6 grid gap-6 lg:grid-cols-2">
	<!-- COD, the number that decides whether the shop makes money -->
	<section class="card !p-5">
		<h2 class="mb-1 text-sm font-medium text-body">Cash on delivery</h2>
		<p class="hint mb-4">Rates are of parcels that reached a courier, not of all orders.</p>

		<div class="grid grid-cols-3 gap-4">
			{#each [['Delivered', rate(data.cod.deliveryRate, attempted), attempted > 0 ? 'text-green-700 dark:text-green-400' : 'text-muted'], ['Returned', rate(data.cod.returnRate, attempted), attempted === 0 ? 'text-muted' : data.cod.returnRate > 0.25 ? 'text-red-700 dark:text-red-400' : 'text-amber-700 dark:text-amber-400'], ['Confirmed on call', rate(data.cod.confirmationRate, data.cod.placed), 'text-strong']] as [label, value, cls] (label)}
				<div>
					<p class="text-xs text-muted">{label}</p>
					<p class="mt-1 font-mono text-xl tabular-nums {cls}">{value}</p>
				</div>
			{/each}
		</div>

		{#if attempted === 0}
			<p class="mt-4 text-xs text-muted">No parcels have completed a delivery attempt in this window yet.</p>
		{/if}

		{#if data.cod.lostToReturnsMinor > 0}
			<p class="mt-4 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
				{taka(data.cod.lostToReturnsMinor)} shipped and came back.
			</p>
		{/if}
	</section>

	<!-- funnel -->
	<section class="card !p-5">
		<h2 class="mb-1 text-sm font-medium text-body">Cart funnel</h2>
		<p class="hint mb-4">From your own database, not pageview analytics.</p>

		<dl class="space-y-2 text-sm">
			{#each [['Carts started', data.funnel.cartsCreated], ['Something added', data.funnel.cartsWithItems], ['Reached checkout', data.funnel.reachedCheckout], ['Ordered', data.funnel.ordered]] as [label, value] (label)}
				<div class="flex items-center justify-between">
					<dt class="text-muted">{label}</dt>
					<dd class="font-mono tabular-nums text-strong">{value}</dd>
				</div>
			{/each}
		</dl>

		<p class="mt-4 border-t border-line/60 pt-3 text-sm">
			<span class="text-muted">Conversion</span>
			<span class="ms-2 font-mono text-lg tabular-nums text-strong">{pct(data.funnel.conversionRate)}</span>
		</p>
	</section>
</div>

<!-- couriers -->
{#if data.couriers.length}
	<section class="card mt-6 !p-5">
		<h2 class="mb-3 text-sm font-medium text-body">Courier performance</h2>
		<table class="w-full text-sm">
			<thead class="text-xs uppercase tracking-wide text-muted">
				<tr>
					<th class="pb-2 text-start font-medium">Courier</th>
					<th class="pb-2 text-end font-medium">Shipped</th>
					<th class="pb-2 text-end font-medium">Delivered</th>
					<th class="pb-2 text-end font-medium">Median days</th>
					<th class="pb-2 text-end font-medium">COD outstanding</th>
				</tr>
			</thead>
			<tbody class="divide-y divide-line/50">
				{#each data.couriers as c (c.courier)}
					{@const attempts = c.delivered + c.returned}
					<tr>
						<td class="py-2 font-medium">{c.courier}</td>
						<td class="py-2 text-end tabular-nums text-muted">{c.shipped}</td>
						<td class="py-2 text-end tabular-nums {attempts === 0 ? 'text-muted' : c.deliveryRate < 0.75 ? 'text-red-700 dark:text-red-400' : ''}">
							{rate(c.deliveryRate, attempts)}
						</td>
						<td class="py-2 text-end tabular-nums text-muted">{c.medianDays ?? '—'}</td>
						<td class="py-2 text-end font-mono tabular-nums {c.outstandingCodMinor > 0 ? 'text-amber-700 dark:text-amber-400' : 'text-muted'}">
							{taka(c.outstandingCodMinor)}
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</section>
{/if}

<div class="mt-6 grid gap-6 lg:grid-cols-2">
	<!-- products -->
	<section class="card !p-5">
		<h2 class="mb-3 text-sm font-medium text-body">Top products</h2>
		{#if data.products.length === 0}
			<p class="text-sm text-muted">Nothing sold in this window.</p>
		{:else}
			<table class="w-full text-sm">
				<tbody class="divide-y divide-line/50">
					{#each data.products as p (p.title)}
						<tr>
							<td class="py-2">{p.title}</td>
							<td class="py-2 text-end tabular-nums text-muted">{p.qty}</td>
							<td class="py-2 text-end font-mono tabular-nums">{taka(p.revenueMinor)}</td>
							<td class="py-2 text-end font-mono tabular-nums text-muted" title="Margin">
								{p.marginMinor === null ? '—' : taka(p.marginMinor)}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
			<p class="hint mt-2">A dash means cost price was never recorded for that product.</p>
		{/if}
	</section>

	<!-- coupons -->
	<section class="card !p-5">
		<h2 class="mb-3 text-sm font-medium text-body">Coupons</h2>
		{#if data.coupons.length === 0}
			<p class="text-sm text-muted">No coupons used in this window.</p>
		{:else}
			<table class="w-full text-sm">
				<tbody class="divide-y divide-line/50">
					{#each data.coupons as c (c.code)}
						<tr>
							<td class="py-2 font-mono">{c.code}</td>
							<td class="py-2 text-end tabular-nums text-muted">{c.uses} uses</td>
							<td class="py-2 text-end font-mono tabular-nums text-amber-700 dark:text-amber-400">−{taka(c.discountMinor)}</td>
							<td class="py-2 text-end font-mono tabular-nums">{taka(c.revenueMinor)}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		{/if}
	</section>
</div>
