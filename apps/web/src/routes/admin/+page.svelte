<script lang="ts">
	import { page } from '$app/state';
	import { minorToTaka } from '@fajr/schemas';
	import Badge from '$lib/components/Badge.svelte';
	import { ORDER_TONE } from '$lib/status';
	import { m } from '$lib/paraglide/messages';

	let { data } = $props();

	const when = (d: Date | string) =>
		new Intl.DateTimeFormat('en-GB', {
			day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Dhaka'
		}).format(new Date(d));

	// Queues first: a dashboard should say what to do, not just what happened.
	const queues = $derived([
		{ label: m.dash_to_call(), value: data.toCall, href: '/admin/orders?view=to-call', urgent: data.toCall > 0 },
		{ label: m.dash_to_ship(), value: data.toShip, href: '/admin/orders?view=confirmed', urgent: false },
		{ label: m.dash_low_stock(), value: data.lowStock, href: '/admin/products', urgent: data.lowStock > 0 }
	]);

</script>

<svelte:head><title>{m.dash_title()} · {page.data.storeName ?? 'Fajr Shop'}</title></svelte:head>

<header>
	<h1 class="text-2xl font-semibold tracking-tight text-strong">{m.dash_title()}</h1>
	<p class="mt-1 text-sm text-muted">Signed in as {data.staff?.email}</p>
</header>

<section class="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
	{#each queues as q (q.label)}
		<a href={q.href} class="card !p-5 transition hover:elevated-lg">
			<p class="text-sm text-muted">{q.label}</p>
			<p class="mt-2 font-mono text-3xl tabular-nums {q.urgent ? 'text-primary-600' : 'text-strong'}">
				{q.value}
			</p>
		</a>
	{/each}

	<div class="card !p-5">
		<p class="text-sm text-muted">{m.dash_last_30()}</p>
		<p class="mt-2 font-mono text-3xl tabular-nums text-strong">৳{minorToTaka(data.revenue.grossMinor)}</p>
		<p class="mt-1 text-xs text-muted">{data.revenue.orders} orders, cancellations excluded</p>
	</div>
</section>

<section class="mt-8">
	<div class="mb-3 flex items-center justify-between">
		<h2 class="font-medium text-strong">{m.dash_recent()}</h2>
		<a href="/admin/orders" class="text-sm text-primary-600 hover:underline">View all</a>
	</div>

	{#if data.recent.length === 0}
		<p class="rounded-3xl border border-dashed border-line/60 p-10 text-center text-sm text-muted">
			{m.dash_no_orders()}
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
								<a href="/admin/orders/{row.id}" class="font-mono font-medium hover:text-primary-600">{row.publicCode}</a>
								<span class="ms-2 text-xs text-muted">{row.phoneE164}</span>
							</td>
							<td class="px-4 py-3 whitespace-nowrap text-muted">{when(row.placedAt)}</td>
							<td class="px-4 py-3">
								<Badge tone={ORDER_TONE[row.status] ?? 'neutral'}>{row.status}</Badge>
							</td>
							<td class="px-4 py-3 text-end font-mono tabular-nums">৳{minorToTaka(row.totalMinor)}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</section>
