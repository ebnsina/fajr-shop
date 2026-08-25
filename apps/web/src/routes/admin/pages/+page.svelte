<script lang="ts">
	import { page } from '$app/state';
	import { enhance } from '$app/forms';
	import Badge from '$lib/components/Badge.svelte';

	let { data, form } = $props();

	const when = (d: Date | string) =>
		new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'Asia/Dhaka' }).format(new Date(d));
</script>

<svelte:head><title>Pages · {page.data.storeName ?? 'Fajr Shop'}</title></svelte:head>

<div class="flex flex-wrap items-center justify-between gap-4">
	<div>
		<h1 class="text-xl font-semibold tracking-tight text-strong">Pages</h1>
		<p class="mt-1 text-sm text-muted">Campaign and content pages, built from blocks.</p>
	</div>

	<form method="POST" action="?/create" use:enhance class="flex gap-2">
		<input name="title" placeholder="New page title" required class="field !w-56" />
		<button class="btn btn-primary">Create</button>
	</form>
</div>

{#if form?.error}
	<p class="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{form.error}</p>
{/if}

{#if data.pages.length === 0}
	<p class="mt-10 rounded-3xl border border-dashed border-line/60 p-10 text-center text-sm text-muted">
		No pages yet. The first one is usually your home page.
	</p>
{:else}
	<div class="mt-6 overflow-x-auto rounded-3xl bg-raised elevated">
		<table class="w-full text-sm">
			<thead class="border-b border-line/60 text-xs uppercase tracking-wide text-muted">
				<tr>
					<th class="px-4 py-3 text-start font-medium">Page</th>
					<th class="px-4 py-3 text-start font-medium">Status</th>
					<th class="px-4 py-3 text-end font-medium">Blocks</th>
					<th class="px-4 py-3 text-end font-medium">Updated</th>
					<th class="px-4 py-3 text-end font-medium">Actions</th>
				</tr>
			</thead>
			<tbody class="divide-y divide-line/50">
				{#each data.pages as p (p.id)}
					<tr class="transition hover:bg-hover">
						<td class="px-4 py-3">
							<a href="/admin/pages/{p.id}" class="font-medium hover:text-primary-600">{p.title}</a>
							<span class="ms-2 font-mono text-xs text-faint">/p/{p.slug}</span>
							{#if p.isHome}
								<span class="ms-2"><Badge tone="info">home</Badge></span>
							{/if}
						</td>
						<td class="px-4 py-3">
							<span class="text-xs {p.status === 'published' ? 'text-green-700 dark:text-green-400' : 'text-muted'}">
								{p.status}
							</span>
							{#if p.unpublishAt}
								<span class="ms-1 text-xs text-amber-700 dark:text-amber-400">until {when(p.unpublishAt)}</span>
							{/if}
						</td>
						<td class="px-4 py-3 text-end tabular-nums text-muted">{p.blockCount}</td>
						<td class="px-4 py-3 text-end whitespace-nowrap text-muted">{when(p.updatedAt)}</td>
						<td class="px-4 py-3">
							<div class="flex justify-end gap-1">
								<!-- Every campaign starts as a copy of the last one that worked. -->
								<form method="POST" action="?/duplicate" use:enhance>
									<input type="hidden" name="id" value={p.id} />
									<button class="btn btn-ghost !py-1 !text-xs">Duplicate</button>
								</form>
								{#if !p.isHome}
									<form method="POST" action="?/home" use:enhance>
										<input type="hidden" name="id" value={p.id} />
										<button class="btn btn-ghost !py-1 !text-xs">Set as home</button>
									</form>
									<form method="POST" action="?/delete" use:enhance>
										<input type="hidden" name="id" value={p.id} />
										<button class="btn btn-ghost !py-1 !text-xs hover:!text-red-600">Delete</button>
									</form>
								{/if}
							</div>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
{/if}
