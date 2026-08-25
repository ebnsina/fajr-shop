<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { minorToTaka } from '@fajr/schemas';
	import Badge from '$lib/components/Badge.svelte';
	import { ORDER_TONE, PAYMENT_TONE } from '$lib/status';
	import { m } from '$lib/paraglide/messages';

	let { data } = $props();

	const pages = $derived(Math.max(1, Math.ceil(data.total / data.perPage)));

	function apply(changes: Record<string, string | null>) {
		const params = new URLSearchParams(page.url.searchParams);
		for (const [k, v] of Object.entries(changes)) {
			if (v) params.set(k, v);
			else params.delete(k);
		}
		if (!('page' in changes)) params.delete('page');
		goto(`?${params}`, { keepFocus: true, noScroll: true });
	}

	let timer: ReturnType<typeof setTimeout>;
	const onSearch = (v: string) => {
		clearTimeout(timer);
		timer = setTimeout(() => apply({ q: v || null }), 250);
	};

	/** Labels resolve per render, so the saved views follow the staff language. */
	const VIEW_LABELS: Record<string, () => string> = {
		all: m.orders_view_all,
		'to-call': m.orders_view_to_call,
		confirmed: m.orders_view_confirmed,
		'to-ship': m.orders_view_to_ship,
		shipped: m.orders_view_shipped,
		cancelled: m.orders_view_cancelled
	};

	const when = (d: Date | string) =>
		new Intl.DateTimeFormat('en-GB', {
			day: 'numeric',
			month: 'short',
			hour: '2-digit',
			minute: '2-digit',
			timeZone: 'Asia/Dhaka'
		}).format(new Date(d));
</script>

<svelte:head><title>{m.orders_title()} · {page.data.storeName ?? 'Fajr Shop'}</title></svelte:head>

<h1 class="text-xl font-semibold tracking-tight">Orders</h1>

<div class="mt-4 flex flex-wrap items-center gap-2 border-b border-line/60 pb-3">
	{#each data.views as v (v.key)}
		<button
			onclick={() => apply({ view: v.key === 'all' ? null : v.key })}
			class="rounded-lg px-3 py-1.5 text-sm transition {data.view === v.key ? 'bg-neutral-900 text-white'
				: 'text-muted hover:bg-active'}"
		>
			{VIEW_LABELS[v.key]?.() ?? v.key}
			{#if data.counts[v.key]}
				<span class="ms-1 opacity-60">{data.counts[v.key]}</span>
			{/if}
		</button>
	{/each}

	<input
		type="search"
		placeholder={m.orders_search_placeholder()}
		value={data.search}
		oninput={(e) => onSearch(e.currentTarget.value)}
		class="field !py-1.5 ms-auto !w-56"
	/>
</div>

{#if data.rows.length === 0}
	<p class="mt-10 rounded-3xl border border-dashed border-line/60 p-10 text-center text-sm text-muted">
		{m.orders_empty()}
	</p>
{:else}
	<div class="mt-4 overflow-x-auto rounded-3xl bg-raised elevated">
		<table class="w-full text-sm">
			<thead class="border-b border-line/60 text-xs uppercase tracking-wide text-muted">
				<tr>
					<th class="px-4 py-3 text-start font-medium">{m.orders_col_order()}</th>
					<th class="px-4 py-3 text-start font-medium">{m.orders_col_placed()}</th>
					<th class="px-4 py-3 text-start font-medium">{m.orders_col_status()}</th>
					<th class="px-4 py-3 text-start font-medium">{m.orders_col_call()}</th>
					<th class="px-4 py-3 text-start font-medium">{m.orders_col_payment()}</th>
					<th class="px-4 py-3 text-end font-medium">{m.orders_col_items()}</th>
					<th class="px-4 py-3 text-end font-medium">{m.orders_col_total()}</th>
				</tr>
			</thead>
			<tbody class="divide-y divide-line/50">
				{#each data.rows as row (row.id)}
					<tr class="transition hover:bg-hover">
						<td class="px-4 py-3">
							<a href="/admin/orders/{row.id}" class="font-medium hover:text-primary-600">{row.publicCode}</a>
							<span class="ms-2 text-xs text-muted">{row.phoneE164}</span>
						</td>
						<td class="px-4 py-3 whitespace-nowrap text-muted">{when(row.placedAt)}</td>
						<td class="px-4 py-3">
							<Badge tone={ORDER_TONE[row.status] ?? 'neutral'}>{row.status}</Badge>
						</td>
						<td class="px-4 py-3 text-xs text-muted">{row.verificationStatus}</td>
						<td class="px-4 py-3">
							<Badge tone={PAYMENT_TONE[row.paymentStatus] ?? 'neutral'}>
								{row.paymentStatus.replace('_', ' ')}
							</Badge>
						</td>
						<td class="px-4 py-3 text-end tabular-nums text-muted">{row.itemCount}</td>
						<td class="px-4 py-3 text-end tabular-nums">৳{minorToTaka(row.totalMinor)}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>

	{#if pages > 1}
		<div class="mt-4 flex items-center justify-between text-sm">
			<span class="text-muted">Page {data.page} of {pages}</span>
			<div class="flex gap-2">
				<button disabled={data.page <= 1} onclick={() => apply({ page: String(data.page - 1) })} class="btn btn-secondary">Previous</button>
				<button disabled={data.page >= pages} onclick={() => apply({ page: String(data.page + 1) })} class="btn btn-secondary">Next</button>
			</div>
		</div>
	{/if}
{/if}
