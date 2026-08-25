<script lang="ts">
	import { page } from '$app/state';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import {
		Call02FreeIcons, PackageOpenFreeIcons, Alert02FreeIcons,
		Mail01FreeIcons, BubbleChatFreeIcons, ArrowUpRight01FreeIcons, ArrowDownRight01FreeIcons
	} from '@hugeicons/core-free-icons';
	import Badge from '$lib/components/Badge.svelte';
	import Sparkline from '$lib/components/Sparkline.svelte';
	import { ORDER_TONE } from '$lib/status';
	import { m } from '$lib/paraglide/messages';
	import { adminMoney } from '$lib/adminMoney';

	let { data } = $props();

	const when = (d: Date | string) =>
		new Intl.DateTimeFormat('en-GB', {
			day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Dhaka'
		}).format(new Date(d));

	const pct = new Intl.NumberFormat('en', { style: 'percent', maximumFractionDigits: 1 });

	// What needs doing, in the order it costs money if ignored.
	const queues = $derived(
		[
			{ label: m.dash_to_call(), value: data.queues.toCall, href: '/admin/orders?view=to-call', icon: Call02FreeIcons, urgent: data.queues.toCall > 0 },
			{ label: m.dash_to_ship(), value: data.queues.toShip, href: '/admin/orders?view=confirmed', icon: PackageOpenFreeIcons, urgent: false },
			{ label: 'Unanswered messages', value: data.queues.unread, href: '/admin/inbox', icon: Mail01FreeIcons, urgent: data.queues.unread > 0 },
			{ label: 'Reviews to approve', value: data.queues.reviews, href: '/admin/reviews', icon: BubbleChatFreeIcons, urgent: false },
			{ label: m.dash_low_stock(), value: data.queues.lowStock, href: '/admin/products', icon: Alert02FreeIcons, urgent: data.queues.lowStock > 0 }
		].filter((q) => q.value > 0 || q.urgent)
	);

	const change = $derived.by(() => {
		const before = data.previousRevenueMinor;
		if (before === null || before === 0) return null;
		return (data.sales.revenueMinor - before) / before;
	});

	const series = $derived(data.series);

	// A return rate is only meaningful once enough parcels have finished.
	const settled = $derived(data.cod.delivered + data.cod.returned);
</script>

<svelte:head><title>{m.dash_title()} · {page.data.storeName ?? 'Fajr Shop'}</title></svelte:head>

<header class="flex flex-wrap items-baseline justify-between gap-3">
	<div>
		<h1 class="text-2xl font-semibold tracking-tight text-strong">{m.dash_title()}</h1>
		<p class="mt-1 text-sm text-muted">Last 30 days · signed in as {data.staff?.email}</p>
	</div>
	<a href="/admin/reports" class="text-sm text-muted hover:text-strong">Full reports →</a>
</header>

<!-- The three numbers that decide whether this shop makes money. -->
<section class="mt-6 grid gap-4 lg:grid-cols-3">
	<div class="card !p-6">
		<p class="text-sm text-muted">{m.dash_last_30()}</p>
		<p class="mt-2 font-mono text-3xl tabular-nums text-strong">
			{adminMoney(data.sales.revenueMinor)}
		</p>

		<div class="mt-1 flex items-center gap-2 text-xs">
			{#if change === null}
				<span class="text-faint">No earlier period to compare with</span>
			{:else}
				{@const up = change >= 0}
				<span class="inline-flex items-center gap-0.5 font-medium {up ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}">
					<HugeiconsIcon icon={up ? ArrowUpRight01FreeIcons : ArrowDownRight01FreeIcons} size={13} aria-hidden="true" />
					{pct.format(Math.abs(change))}
				</span>
				<span class="text-faint">vs the 30 days before</span>
			{/if}
		</div>

		<div class="mt-4 text-primary-600 dark:text-primary-400">
			<Sparkline points={series} label="Daily revenue over the last 30 days" />
		</div>

		<p class="mt-3 text-xs text-muted">
			{data.sales.orders} orders · {adminMoney(data.sales.averageOrderMinor)} average
		</p>
	</div>

	<div class="card !p-6">
		<p class="text-sm text-muted">Returns</p>
		{#if settled < 5}
			<p class="mt-2 font-mono text-3xl tabular-nums text-faint">—</p>
			<p class="mt-1 text-xs text-muted">
				Only {settled} {settled === 1 ? 'parcel has' : 'parcels have'} finished delivery.
				A rate from that would mislead.
			</p>
		{:else}
			{@const bad = data.cod.returnRate > 0.2}
			<p class="mt-2 font-mono text-3xl tabular-nums {bad ? 'text-red-700 dark:text-red-400' : 'text-strong'}">
				{pct.format(data.cod.returnRate)}
			</p>
			<p class="mt-1 text-xs text-muted">
				{data.cod.returned} of {settled} parcels came back
			</p>
			<p class="mt-4 text-sm text-body">
				{adminMoney(data.cod.lostToReturnsMinor)}
				<span class="text-muted">lost to returns</span>
			</p>
		{/if}
	</div>

	<div class="card !p-6">
		<p class="text-sm text-muted">COD not yet paid to you</p>
		<p class="mt-2 font-mono text-3xl tabular-nums text-strong">
			{adminMoney(data.outstandingCodMinor)}
		</p>
		<p class="mt-1 text-xs text-muted">
			Delivered parcels the courier still owes you for
		</p>
		<a href="/admin/reports" class="mt-4 inline-block text-sm text-primary-600 hover:underline dark:text-primary-400">
			Reconcile payouts →
		</a>
	</div>
</section>

{#if queues.length}
	<section class="mt-8">
		<h2 class="text-sm font-medium uppercase tracking-wide text-faint">Needs you</h2>
		<ul class="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
			{#each queues as q (q.label)}
				<li>
					<a href={q.href} class="card flex items-center gap-3 !py-4 transition hover:elevated-lg">
						<span
							class="grid size-9 shrink-0 place-items-center rounded-xl {q.urgent
								? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
								: 'bg-active text-muted'}"
						>
							<HugeiconsIcon icon={q.icon} size={18} aria-hidden="true" />
						</span>
						<span class="min-w-0 flex-1 text-sm text-body">{q.label}</span>
						<span class="font-mono text-xl tabular-nums text-strong">{q.value}</span>
					</a>
				</li>
			{/each}
		</ul>
	</section>
{:else}
	<p class="mt-8 rounded-3xl border border-dashed border-line/60 p-8 text-center text-sm text-muted">
		Nothing waiting. Every order is called, packed and answered.
	</p>
{/if}

<div class="mt-8 grid gap-6 lg:grid-cols-[3fr_2fr]">
	<section>
		<div class="mb-3 flex items-center justify-between">
			<h2 class="text-sm font-medium uppercase tracking-wide text-faint">Recent orders</h2>
			<a href="/admin/orders" class="text-sm text-primary-600 hover:underline dark:text-primary-400">View all</a>
		</div>

		{#if data.recent.length === 0}
			<p class="rounded-3xl border border-dashed border-line/60 p-8 text-center text-sm text-muted">
				No orders yet.
			</p>
		{:else}
			<div class="overflow-x-auto rounded-3xl bg-raised elevated">
				<table class="w-full text-sm">
					<thead class="border-b border-line/60 text-xs uppercase tracking-wide text-muted">
						<tr>
							<th class="px-4 py-3 text-start font-medium">Order</th>
							<th class="px-4 py-3 text-start font-medium">Placed</th>
							<th class="px-4 py-3 text-start font-medium">Status</th>
							<th class="px-4 py-3 text-end font-medium">Total</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-line/50">
						{#each data.recent as row (row.id)}
							<tr class="transition hover:bg-hover">
								<td class="px-4 py-3">
									<a href="/admin/orders/{row.id}" class="font-medium hover:text-primary-600">{row.publicCode}</a>
									<span class="ms-2 text-xs text-muted">{row.phoneE164}</span>
								</td>
								<td class="px-4 py-3 whitespace-nowrap text-muted">{when(row.placedAt)}</td>
								<td class="px-4 py-3">
									<Badge tone={ORDER_TONE[row.status] ?? 'neutral'}>{row.status}</Badge>
								</td>
								<td class="px-4 py-3 text-end font-mono tabular-nums">{adminMoney(row.totalMinor)}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</section>

	<section>
		<div class="mb-3 flex items-center justify-between">
			<h2 class="text-sm font-medium uppercase tracking-wide text-faint">Running low</h2>
			<a href="/admin/products" class="text-sm text-primary-600 hover:underline dark:text-primary-400">Products</a>
		</div>

		{#if data.lowStockItems.length === 0}
			<p class="rounded-3xl border border-dashed border-line/60 p-8 text-center text-sm text-muted">
				Nothing is running low.
			</p>
		{:else}
			<ul class="space-y-2">
				{#each data.lowStockItems as item (item.id)}
					<li>
						<a href="/admin/products/{item.id}" class="card flex items-center gap-3 !py-3 transition hover:elevated-lg">
							<span class="min-w-0 flex-1 truncate text-sm text-body">{item.title}</span>
							<span class="font-mono text-sm tabular-nums {Number(item.stock) <= 0 ? 'text-red-700 dark:text-red-400' : 'text-strong'}">
								{item.stock}
							</span>
						</a>
					</li>
				{/each}
			</ul>
		{/if}
	</section>
</div>
