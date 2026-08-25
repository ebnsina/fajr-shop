<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { minorToTaka } from '@fajr/schemas';
	import Badge from '$lib/components/Badge.svelte';
	import { SEGMENT_LABELS, SEGMENT_TONE } from '$lib/status';

	let { data } = $props();

	function apply(changes: Record<string, string | null>) {
		const params = new URLSearchParams(page.url.searchParams);
		for (const [k, v] of Object.entries(changes)) {
			if (v) params.set(k, v);
			else params.delete(k);
		}
		goto(`?${params}`, { keepFocus: true, noScroll: true });
	}

	let timer: ReturnType<typeof setTimeout>;
	const onSearch = (v: string) => {
		clearTimeout(timer);
		timer = setTimeout(() => apply({ q: v || null }), 250);
	};


	const segments = Object.entries(SEGMENT_LABELS) as [keyof typeof SEGMENT_LABELS, string][];
	const ago = (d: number) => (d === 0 ? 'today' : d === 1 ? 'yesterday' : `${d}d ago`);
</script>

<svelte:head><title>Customers · Fajr Shop</title></svelte:head>

<h1 class="text-xl font-semibold tracking-tight text-strong">Customers</h1>
<p class="mt-1 text-sm text-muted">Built from orders by phone — most buyers never create an account.</p>

<div class="mt-4 flex flex-wrap items-center gap-2 border-b border-line/60 pb-3">
	<button
		onclick={() => apply({ segment: null })}
		class="rounded-xl px-3 py-1.5 text-sm transition {data.segment === null ? 'bg-strong text-raised' : 'text-muted hover:bg-hover'}"
	>
		All
	</button>
	{#each segments as [key, label] (key)}
		{#if data.counts[key] > 0}
			<button
				onclick={() => apply({ segment: key })}
				class="rounded-xl px-3 py-1.5 text-sm transition {data.segment === key ? 'bg-strong text-raised' : 'text-muted hover:bg-hover'}"
			>
				{label}<span class="ms-1 opacity-60">{data.counts[key]}</span>
			</button>
		{/if}
	{/each}

	<input
		type="search"
		placeholder="Phone or name…"
		value={data.search}
		oninput={(e) => onSearch(e.currentTarget.value)}
		class="field !py-1.5 ms-auto !w-56"
	/>
</div>

{#if data.rows.length === 0}
	<p class="mt-10 rounded-3xl border border-dashed border-line/60 p-10 text-center text-sm text-muted">
		No customers here yet.
	</p>
{:else}
	<div class="mt-4 overflow-x-auto rounded-3xl bg-raised elevated">
		<table class="w-full text-sm">
			<thead class="border-b border-line/60 text-xs uppercase tracking-wide text-muted">
				<tr>
					<th class="px-4 py-3 text-start font-medium">Customer</th>
					<th class="px-4 py-3 text-start font-medium">Segment</th>
					<th class="px-4 py-3 text-end font-medium">Orders</th>
					<th class="px-4 py-3 text-end font-medium">Returned</th>
					<th class="px-4 py-3 text-end font-medium">Lifetime</th>
					<th class="px-4 py-3 text-end font-medium">Last order</th>
				</tr>
			</thead>
			<tbody class="divide-y divide-line/50">
				{#each data.rows as c (c.phoneE164)}
					<tr class="transition hover:bg-hover">
						<td class="px-4 py-3">
							<a href="/admin/customers/{encodeURIComponent(c.phoneE164)}" class="font-medium hover:text-primary-600">
								{c.name ?? 'Unnamed'}
							</a>
							<span class="ms-2 font-mono text-xs text-muted">{c.phoneE164}</span>
							{#if c.isBlacklisted}
								<span class="ms-2"><Badge tone="danger">blocked</Badge></span>
							{/if}
						</td>
						<td class="px-4 py-3">
							<Badge tone={SEGMENT_TONE[c.segment] ?? 'neutral'}>{c.label}</Badge>
						</td>
						<td class="px-4 py-3 text-end tabular-nums">{c.orders}</td>
						<td class="px-4 py-3 text-end tabular-nums {c.returned > 0 ? 'text-amber-700 dark:text-amber-400' : 'text-muted'}">
							{c.returned}
						</td>
						<td class="px-4 py-3 text-end font-mono tabular-nums">৳{minorToTaka(c.lifetimeMinor)}</td>
						<td class="px-4 py-3 text-end whitespace-nowrap text-muted">{ago(c.recencyDays)}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
{/if}
