<script lang="ts">
	import { enhance } from '$app/forms';

	let { data, form } = $props();
	let busy = $state(false);

	const submitting = () => {
		busy = true;
		return async ({ update }: { update: () => Promise<void> }) => {
			await update();
			busy = false;
		};
	};
</script>

<svelte:head><title>Import products · Fajr Shop</title></svelte:head>

<a href="/admin/products" class="text-sm text-muted hover:text-strong">← Products</a>
<h1 class="mt-1 text-xl font-semibold tracking-tight text-strong">Import products</h1>
<p class="mt-1 text-sm text-muted">
	From a Shopify or WooCommerce export, or any CSV — you map the columns.
</p>

{#if form?.error}
	<p class="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300" role="alert">
		{form.error}
	</p>
{/if}

{#if !form || !('step' in form)}
	<form method="POST" action="?/analyse" enctype="multipart/form-data" use:enhance={submitting} class="card mt-6 !p-5">
		<label class="label" for="file">CSV file</label>
		<input id="file" name="file" type="file" accept=".csv,text/csv" required class="field" />
		<p class="hint mt-2">Nothing is written until you have seen what will happen.</p>
		<button disabled={busy} class="btn btn-primary mt-4">{busy ? 'Reading…' : 'Read file'}</button>
	</form>

{:else if form.step === 'review'}
	<form method="POST" action="?/run" use:enhance={submitting} class="mt-6 space-y-6">
		<input type="hidden" name="csv" value={form.csv} />

		<section class="card !p-5">
			<h2 class="text-sm font-medium text-body">What was found</h2>
			<p class="mt-1 text-sm text-muted">
				{form.rowCount} rows → <strong class="text-strong">{form.planned} products</strong>
				{#if form.presetId}· detected as {form.presetId}{/if}
			</p>

			{#if form.errorCount}
				<div class="mt-3 rounded-xl bg-amber-50 p-3 dark:bg-amber-950/30">
					<p class="text-sm font-medium text-amber-900 dark:text-amber-200">
						{form.errorCount} rows will be skipped
					</p>
					<ul class="mt-2 space-y-1 text-xs text-amber-900 dark:text-amber-200">
						{#each form.errors as e (e.row + e.handle)}
							<li>Row {e.row || '—'} {e.handle}: {e.reason}</li>
						{/each}
					</ul>
				</div>
			{/if}

			{#if form.preview?.length}
				<table class="mt-4 w-full text-sm">
					<thead class="text-xs uppercase tracking-wide text-muted">
						<tr>
							<th class="pb-2 text-start font-medium">Product</th>
							<th class="pb-2 text-start font-medium">Category</th>
							<th class="pb-2 text-end font-medium">Variants</th>
							<th class="pb-2 text-end font-medium">Status</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-line/50">
						{#each form.preview as p (p.title)}
							<tr>
								<td class="py-2">{p.title}</td>
								<td class="py-2 text-muted">{p.category ?? '—'}</td>
								<td class="py-2 text-end tabular-nums">{p.variants}</td>
								<td class="py-2 text-end text-xs text-muted">{p.status}</td>
							</tr>
						{/each}
					</tbody>
				</table>
				<p class="hint mt-2">Showing the first {form.preview.length}.</p>
			{/if}
		</section>

		<section class="card !p-5">
			<h2 class="text-sm font-medium text-body">Column mapping</h2>
			<p class="hint mt-1">Title and price are required. Anything unmapped is ignored.</p>

			<div class="mt-3 grid gap-3 sm:grid-cols-2">
				{#each data.fields as field (field.key)}
					<div>
						<label class="label" for="map-{field.key}">
							{field.label}{#if field.required}<span class="text-red-600"> *</span>{/if}
						</label>
						<select id="map-{field.key}" name="map.{field.key}" value={form.mapping?.[field.key] ?? ''} class="field">
							<option value="">— not mapped —</option>
							{#each form.headers as h (h)}<option value={h}>{h}</option>{/each}
						</select>
					</div>
				{/each}
			</div>

			<button formaction="?/dryRun" disabled={busy} class="btn btn-secondary mt-4">
				Re-check with this mapping
			</button>
		</section>

		<section class="card !p-5 space-y-3">
			<h2 class="text-sm font-medium text-body">Before importing</h2>

			<div>
				<label class="label" for="source">Source name</label>
				<input id="source" name="source" value={form.presetId ?? 'csv'} class="field" />
				<p class="hint mt-1">
					Re-importing with the same source updates these products instead of creating duplicates.
				</p>
			</div>

			<div>
				<label class="label" for="oldUrlPattern">Old product URL pattern</label>
				<input id="oldUrlPattern" name="oldUrlPattern" placeholder="/products/{'{handle}'}" class="field" />
				<p class="hint mt-1">
					Writes a redirect from every old URL. Skipping this throws away the store's
					search traffic on day one.
				</p>
			</div>

			<button disabled={busy} class="btn btn-primary w-full">
				{busy ? 'Importing…' : `Import ${form.planned} products`}
			</button>
		</section>
	</form>

{:else if form.step === 'done'}
	<section class="card mt-6 !p-5">
		<h2 class="text-sm font-medium text-body">Import finished</h2>
		<dl class="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
			{#each [['Created', form.result.created], ['Updated', form.result.updated], ['Skipped', form.result.skipped], ['Redirects', form.result.redirects]] as [label, value] (label)}
				<div>
					<dt class="text-muted">{label}</dt>
					<dd class="mt-1 font-mono text-xl tabular-nums text-strong">{value}</dd>
				</div>
			{/each}
		</dl>

		{#if form.result.errors.length}
			<details class="mt-4">
				<summary class="text-sm text-body">{form.result.errors.length} rows had problems</summary>
				<ul class="mt-2 space-y-1 text-xs text-muted">
					{#each form.result.errors as e (e.handle + e.reason)}
						<li>{e.handle}: {e.reason}</li>
					{/each}
				</ul>
			</details>
		{/if}

		<div class="mt-4 flex gap-2">
			<a href="/admin/products" class="btn btn-primary">View products</a>
			<a href="/admin/products/import" class="btn btn-secondary">Import another file</a>
		</div>
	</section>
{/if}
