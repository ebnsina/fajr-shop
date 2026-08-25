<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { minorToTaka } from '@fajr/schemas';
	import Badge from '$lib/components/Badge.svelte';
	import { PRODUCT_TONE } from '$lib/status';
	import { m } from '$lib/paraglide/messages';

	let { data } = $props();

	const pages = $derived(Math.max(1, Math.ceil(data.total / data.perPage)));

	/** One place to build the query string, so filters compose instead of clobbering. */
	function apply(changes: Record<string, string | null>) {
		const params = new URLSearchParams(page.url.searchParams);
		for (const [key, value] of Object.entries(changes)) {
			if (value) params.set(key, value);
			else params.delete(key);
		}
		if (!('page' in changes)) params.delete('page');
		goto(`?${params}`, { keepFocus: true, noScroll: true });
	}

	let searchTimer: ReturnType<typeof setTimeout>;
	const onSearch = (value: string) => {
		clearTimeout(searchTimer);
		searchTimer = setTimeout(() => apply({ q: value || null }), 250);
	};

</script>

<svelte:head><title>{m.products_title()} · {page.data.storeName ?? 'Fajr Shop'}</title></svelte:head>

<div class="flex items-center justify-between gap-4">
	<div>
		<h1 class="text-xl font-semibold tracking-tight">{m.products_title()}</h1>
		<p class="mt-1 text-sm text-muted">{data.total} total</p>
	</div>
	<div class="flex gap-2">
		<a href="/admin/products/import" class="btn btn-secondary">{m.products_import()}</a>
		<a href="/admin/products/new" class="btn btn-primary">{m.products_add()}</a>
	</div>
</div>

<div class="mt-6 flex flex-wrap gap-3">
	<input
		type="search"
		placeholder={m.products_search()}
		value={data.search}
		oninput={(e) => onSearch(e.currentTarget.value)}
		class="field min-w-64 flex-1 !w-auto"
	/>

	<select
		value={data.status ?? ''}
		onchange={(e) => apply({ status: e.currentTarget.value || null })}
		class="field !w-auto"
	>
		<option value="">{m.products_all_statuses()}</option>
		<option value="active">Active</option>
		<option value="draft">Draft</option>
		<option value="archived">Archived</option>
	</select>

	<select
		value={data.categoryId ?? ''}
		onchange={(e) => apply({ category: e.currentTarget.value || null })}
		class="field !w-auto"
	>
		<option value="">{m.products_all_categories()}</option>
		{#each data.categories as c (c.id)}
			<option value={c.id}>{c.label}</option>
		{/each}
	</select>
</div>

{#if data.rows.length === 0}
	<p class="mt-10 rounded-3xl border border-dashed border-line/60 p-10 text-center text-sm text-muted">
		{data.search ? `Nothing matches “${data.search}”.` : 'No products yet.'}
	</p>
{:else}
	<div class="mt-4 overflow-x-auto rounded-3xl bg-raised elevated">
		<table class="w-full text-sm">
			<thead class="border-b border-line text-start text-xs uppercase tracking-wide text-muted">
				<tr>
					<th class="px-4 py-3 text-start font-medium">Product</th>
					<th class="px-4 py-3 text-start font-medium">Status</th>
					<th class="px-4 py-3 text-end font-medium">Price</th>
					<th class="px-4 py-3 text-end font-medium">Stock</th>
					<th class="px-4 py-3 text-end font-medium">Variants</th>
				</tr>
			</thead>
			<tbody class="divide-y divide-line/50">
				{#each data.rows as row (row.id)}
					<tr class="transition hover:bg-hover">
						<td class="px-4 py-3">
							<a href="/admin/products/{row.id}" class="font-medium hover:text-primary-600">{row.title}</a>
							<span class="ms-2 text-xs text-faint">/{row.slug}</span>
						</td>
						<td class="px-4 py-3">
							<Badge tone={PRODUCT_TONE[row.status] ?? 'neutral'}>{row.status}</Badge>
						</td>
						<td class="px-4 py-3 text-end tabular-nums">
							{row.priceMinor === null ? '—' : `৳${minorToTaka(row.priceMinor)}`}
						</td>
						<td
							class="px-4 py-3 text-end tabular-nums {Number(row.stock) <= 0 ? 'text-red-600' : ''}"
						>
							{row.stock}
						</td>
						<td class="px-4 py-3 text-end tabular-nums text-muted">{row.variantCount}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>

	{#if pages > 1}
		<div class="mt-4 flex items-center justify-between text-sm">
			<span class="text-muted">Page {data.page} of {pages}</span>
			<div class="flex gap-2">
				<button
					disabled={data.page <= 1}
					onclick={() => apply({ page: String(data.page - 1) })}
					class="btn btn-secondary"
				>
					Previous
				</button>
				<button
					disabled={data.page >= pages}
					onclick={() => apply({ page: String(data.page + 1) })}
					class="btn btn-secondary"
				>
					Next
				</button>
			</div>
		</div>
	{/if}
{/if}
