<script lang="ts">
	import { enhance } from '$app/forms';
	import type { CategoryNode } from '@fajr/core/catalog';

	let { data, form } = $props();

	function flatten(nodes: CategoryNode[]): { id: string; label: string }[] {
		return nodes.flatMap((n) => [
			{ id: n.id, label: `${'— '.repeat(n.depth)}${n.name}` },
			...flatten(n.children)
		]);
	}
	const all = $derived(flatten(data.tree));
</script>

<svelte:head><title>Categories · Fajr Shop</title></svelte:head>

<h1 class="text-xl font-semibold tracking-tight">Categories</h1>
<p class="mt-1 text-sm text-muted">
	Deleting a category never deletes its products — they just lose the category.
</p>

{#if form?.error}
	<p class="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{form.error}</p>
{/if}

<form method="POST" action="?/create" use:enhance class="mt-6 flex flex-wrap gap-2 card !p-4">
	<input name="name" placeholder="New category name" required class="min-w-56 flex-1 field !w-auto" />
	<select name="parentId" class="field">
		<option value="">Top level</option>
		{#each all as c (c.id)}<option value={c.id}>{c.label}</option>{/each}
	</select>
	<button class="btn btn-primary">Add</button>
</form>

{#snippet branch(nodes: CategoryNode[])}
	<ul class="space-y-1">
		{#each nodes as node (node.id)}
			<li>
				<div class="flex flex-wrap items-center gap-2 rounded-lg px-2 py-1.5 transition hover:bg-hover" style="margin-inline-start: {node.depth * 1.25}rem">
					<form method="POST" action="?/rename" use:enhance class="flex-1">
						<input type="hidden" name="id" value={node.id} />
						<input
							name="name"
							value={node.name}
							onblur={(e) => e.currentTarget.value !== node.name && e.currentTarget.form?.requestSubmit()}
							class="w-full rounded border border-transparent bg-transparent px-2 py-1 text-sm hover:border-line focus:bg-raised focus:outline-none"
						/>
					</form>

					<span class="text-xs text-faint">/{node.slug}</span>

					<form method="POST" action="?/move" use:enhance>
						<input type="hidden" name="id" value={node.id} />
						<select
							name="parentId"
							value={node.parentId ?? ''}
							onchange={(e) => e.currentTarget.form?.requestSubmit()}
							class="field !px-2 !py-1 !text-xs"
						>
							<option value="">Top level</option>
							{#each all.filter((c) => c.id !== node.id) as c (c.id)}
								<option value={c.id}>{c.label}</option>
							{/each}
						</select>
					</form>

					<form method="POST" action="?/delete" use:enhance>
						<input type="hidden" name="id" value={node.id} />
						<button class="px-2 text-xs text-faint transition hover:text-red-600">Delete</button>
					</form>
				</div>

				{#if node.children.length}
					{@render branch(node.children)}
				{/if}
			</li>
		{/each}
	</ul>
{/snippet}

<div class="mt-6 card !p-4">
	{#if data.editing}
	{@const name = flatten(data.tree).find((c) => c.id === data.editing)?.label.replace(/^—+ /, '') ?? ''}
	<section class="card mb-6 !p-5">
		<div class="mb-1 flex items-center justify-between">
			<h2 class="text-sm font-medium text-body">Specifications for {name}</h2>
			<a href="/admin/categories" class="btn btn-ghost !py-1 !text-xs">Done</a>
		</div>
		<p class="hint mb-3">
			These drive the spec table on the product page and the filters on the category
			page. Fashion categories usually need none.
		</p>

		{#if data.attributes.length}
			<ul class="mb-3 space-y-2">
				{#each data.attributes as a (a.id)}
					<li>
						<form method="POST" action="?/attribute" use:enhance class="flex flex-wrap items-center gap-2">
							<input type="hidden" name="id" value={a.id} />
							<input type="hidden" name="categoryId" value={data.editing} />
							<input name="sort" type="number" value={a.sort} class="field !w-14 !px-2 !py-1 !text-xs tabular-nums" aria-label="Order" />
							<input name="name" value={a.name} class="field !w-40 !py-1 !text-sm" aria-label="Name" />
							<input name="unit" value={a.unit ?? ''} placeholder="Unit" class="field !w-24 !py-1 !text-sm" aria-label="Unit" />
							<label class="flex items-center gap-1.5 text-xs text-muted">
								<input type="checkbox" name="isFilterable" checked={a.isFilterable} />
								Filterable
							</label>
							<button class="btn btn-secondary !py-1 !text-xs">Save</button>
						</form>
					</li>
				{/each}
			</ul>
		{/if}

		<form method="POST" action="?/attribute" use:enhance class="flex flex-wrap gap-2">
			<input type="hidden" name="categoryId" value={data.editing} />
			<input type="hidden" name="sort" value={data.attributes.length} />
			<input name="name" placeholder="e.g. RAM" required class="field !w-40 !py-1.5" aria-label="Attribute name" />
			<input name="unit" placeholder="Unit, e.g. GB" class="field !w-32 !py-1.5" aria-label="Unit" />
			<label class="flex items-center gap-1.5 text-xs text-muted">
				<input type="checkbox" name="isFilterable" checked />
				Filterable
			</label>
			<button class="btn btn-primary">Add</button>
		</form>
	</section>
{/if}

{#if data.tree.length === 0}
		<p class="py-8 text-center text-sm text-muted">No categories yet.</p>
	{:else}
		{@render branch(data.tree)}
	{/if}
</div>
