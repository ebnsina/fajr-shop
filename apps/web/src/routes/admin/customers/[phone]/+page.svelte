<script lang="ts">
	import { page } from '$app/state';
	import { enhance } from '$app/forms';
	import { minorToTaka } from '@fajr/schemas';
	import Badge from '$lib/components/Badge.svelte';
	import { SEGMENT_TONE } from '$lib/status';
	import { adminMoney } from '$lib/adminMoney';

	let { data, form } = $props();
	const p = $derived(data.profile);

	const taka = (m: number) => adminMoney(m);
	const when = (d: Date | string) =>
		new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Dhaka' })
			.format(new Date(d));

	const riskStyle: Record<string, string> = {
		low: 'text-green-700 dark:text-green-400',
		medium: 'text-amber-700 dark:text-amber-400',
		high: 'text-red-700 dark:text-red-400',
		unknown: 'text-muted'
	};
</script>

<svelte:head><title>{p.name ?? p.phoneE164} · Customers · {page.data.storeName ?? 'Fajr Shop'}</title></svelte:head>

<a href="/admin/customers" class="text-sm text-muted hover:text-strong">← Customers</a>

<div class="mt-1 flex flex-wrap items-center gap-3">
	<h1 class="text-xl font-semibold tracking-tight text-strong">{p.name ?? 'Unnamed'}</h1>
	<Badge tone={SEGMENT_TONE[p.segment] ?? 'neutral'}>{p.label}</Badge>
	{#if p.isBlacklisted}
		<Badge tone="danger">blocked</Badge>
	{/if}
</div>
<p class="mt-1 font-mono text-sm text-muted">{p.phoneE164}</p>
<p class="mt-2 text-sm text-muted">{p.action}</p>

{#if form?.error}
	<p class="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{form.error}</p>
{/if}

<section class="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
	{#each [['Orders', String(p.orders)], ['Delivered', String(p.delivered)], ['Returned', String(p.returned)], ['Lifetime', taka(p.lifetimeMinor)]] as [label, value] (label)}
		<div class="card !p-5">
			<p class="text-sm text-muted">{label}</p>
			<p class="mt-2 font-mono text-2xl tabular-nums text-strong">{value}</p>
		</div>
	{/each}
</section>

<div class="mt-6 grid gap-6 lg:grid-cols-3">
	<section class="card !p-5 lg:col-span-2">
		<h2 class="mb-3 text-sm font-medium text-body">Order history</h2>
		<table class="w-full text-sm">
			<tbody class="divide-y divide-line/50">
				{#each p.history as o (o.id)}
					<tr>
						<td class="py-2">
							<a href="/admin/orders/{o.id}" class="font-mono font-medium hover:text-primary-600">{o.publicCode}</a>
						</td>
						<td class="py-2 text-muted">{when(o.placedAt)}</td>
						<td class="py-2 text-xs text-muted">{o.status}</td>
						<td class="py-2 text-end tabular-nums text-muted">{o.itemCount} items</td>
						<td class="py-2 text-end font-mono tabular-nums">{taka(o.totalMinor)}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</section>

	<div class="space-y-6">
		{#if data.risk}
			<section class="card !p-5">
				<h2 class="mb-2 text-sm font-medium text-body">Courier history</h2>
				<p class="font-mono text-2xl tabular-nums {riskStyle[data.risk.band]}">{data.risk.score}</p>
				<p class="mt-1 text-xs text-muted">{data.risk.reason}</p>
				{#if data.risk.cached}<p class="hint mt-2">Cached lookup.</p>{/if}
			</section>
		{/if}

		<form method="POST" action="?/note" use:enhance class="card !p-5">
			<h2 class="mb-2 text-sm font-medium text-body">Note</h2>
			<textarea name="note" rows="3" class="field">{p.note ?? ''}</textarea>
			<button class="btn btn-secondary mt-2 w-full">Save note</button>
		</form>

		<form method="POST" action="?/blacklist" use:enhance class="card !p-5">
			<h2 class="mb-2 text-sm font-medium text-body">
				{p.isBlacklisted ? 'Unblock' : 'Block this customer'}
			</h2>
			<input type="hidden" name="blocked" value={String(!p.isBlacklisted)} />
			{#if !p.isBlacklisted}
				<input name="note" placeholder="Reason" value={p.note ?? ''} class="field" />
				<p class="hint mt-1">They will not be able to place an order.</p>
			{/if}
			<button class="btn {p.isBlacklisted ? 'btn-secondary' : 'btn-danger'} mt-2 w-full">
				{p.isBlacklisted ? 'Unblock' : 'Block'}
			</button>
		</form>
	</div>
</div>
