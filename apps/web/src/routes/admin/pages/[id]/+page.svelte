<script lang="ts">
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import {
		Delete02FreeIcons,
		DragDropVerticalFreeIcons,
		LinkSquare01FreeIcons,
		ViewFreeIcons,
		ViewOffFreeIcons
	} from '@hugeicons/core-free-icons';
	import { enhance } from '$app/forms';
	import { dndzone, type DndEvent } from 'svelte-dnd-action';
	import { flip } from 'svelte/animate';
	import { BLOCK_LABELS, type BlockType } from '@fajr/schemas';
	import BlockFields from '$lib/components/BlockFields.svelte';

	let { data, form } = $props();

	type Row = { id: string; type: string; props: Record<string, any>; isVisible: boolean };

	// svelte-ignore state_referenced_locally
	let blocks = $state<Row[]>(data.page.blocks.map((b) => ({ ...b, props: { ...b.props } })) as Row[]);
	let openId = $state<string | null>(null);
	let reorderForm = $state<HTMLFormElement | null>(null);

	// Reload from the server after any action that changes the set of blocks.
	$effect(() => {
		const fresh = data.page.blocks as Row[];
		const same =
			fresh.length === blocks.length && fresh.every((b, i) => b.id === blocks[i]?.id);
		if (!same) blocks = fresh.map((b) => ({ ...b, props: { ...b.props } }));
	});

	const order = $derived(blocks.map((b) => b.id).join(','));

	function onDnd(e: CustomEvent<DndEvent<Row>>) {
		blocks = e.detail.items;
	}

	function onDrop(e: CustomEvent<DndEvent<Row>>) {
		blocks = e.detail.items;
		// Persist the order the editor is showing, rather than diffing positions.
		reorderForm?.requestSubmit();
	}

	const FLIP = { duration: 180 };
</script>

<svelte:head><title>{data.page.title} · Pages · Fajr Shop</title></svelte:head>

<div class="flex flex-wrap items-start justify-between gap-4">
	<div>
		<a href="/admin/pages" class="text-sm text-muted hover:text-strong">← Pages</a>
		<h1 class="mt-1 text-xl font-semibold tracking-tight text-strong">{data.page.title}</h1>
		<p class="mt-1 font-mono text-xs text-faint">/p/{data.page.slug}</p>
	</div>

	<a
		href="/p/{data.page.slug}?preview={data.page.previewToken}"
		target="_blank"
		rel="noopener"
		class="btn btn-secondary"
	>
		<HugeiconsIcon icon={LinkSquare01FreeIcons} size={15} strokeWidth={1.75} /> Preview
	</a>
</div>

{#if form?.error}
	<p class="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{form.error}</p>
{/if}

<div class="mt-6 grid gap-6 lg:grid-cols-3">
	<!-- block list -->
	<div class="lg:col-span-2">
		<form method="POST" action="?/reorder" use:enhance bind:this={reorderForm} class="hidden">
			<input type="hidden" name="order" value={order} />
		</form>

		{#if blocks.length === 0}
			<p class="rounded-3xl border border-dashed border-line/60 p-10 text-center text-sm text-muted">
				Empty page. Add a block from the right.
			</p>
		{:else}
			<ul
				use:dndzone={{ items: blocks, flipDurationMs: 180, dropTargetStyle: {} }}
				onconsider={onDnd}
				onfinalize={onDrop}
				class="space-y-2"
			>
				{#each blocks as b (b.id)}
					<li animate:flip={FLIP} class="rounded-3xl bg-raised elevated">
						<div class="flex items-center gap-2 p-3">
							<span class="cursor-grab text-faint active:cursor-grabbing" aria-label="Drag to reorder">
								<HugeiconsIcon icon={DragDropVerticalFreeIcons} size={18} strokeWidth={1.75} />
							</span>

							<button
								type="button"
								class="flex-1 text-start text-sm font-medium text-strong"
								onclick={() => (openId = openId === b.id ? null : b.id)}
							>
								{BLOCK_LABELS[b.type as BlockType] ?? b.type}
								{#if !b.isVisible}<span class="ms-2 text-xs font-normal text-muted">hidden</span>{/if}
							</button>

							<form method="POST" action="?/visibility" use:enhance>
								<input type="hidden" name="id" value={b.id} />
								<input type="hidden" name="visible" value={String(!b.isVisible)} />
								<button class="btn btn-ghost !px-2" aria-label={b.isVisible ? 'Hide block' : 'Show block'}>
									{#if b.isVisible}<HugeiconsIcon icon={ViewFreeIcons} size={16} strokeWidth={1.75} />{:else}<HugeiconsIcon icon={ViewOffFreeIcons} size={16} strokeWidth={1.75} />{/if}
								</button>
							</form>

							<form method="POST" action="?/remove" use:enhance>
								<input type="hidden" name="id" value={b.id} />
								<button class="btn btn-ghost !px-2 hover:!text-red-600" aria-label="Delete block">
									<HugeiconsIcon icon={Delete02FreeIcons} size={16} strokeWidth={1.75} />
								</button>
							</form>
						</div>

						{#if openId === b.id}
							<form method="POST" action="?/block" use:enhance class="border-t border-line/60 p-4">
								<input type="hidden" name="id" value={b.id} />
								<input type="hidden" name="props" value={JSON.stringify(b.props)} />
								<BlockFields type={b.type as BlockType} bind:props={b.props} media={data.media} />
								<button class="btn btn-primary mt-4">Save block</button>
							</form>
						{/if}
					</li>
				{/each}
			</ul>
		{/if}
	</div>

	<!-- sidebar -->
	<div class="space-y-6">
		<section class="card !p-5">
			<h2 class="mb-3 text-sm font-medium text-body">Add a block</h2>
			<div class="flex flex-wrap gap-1.5">
				{#each data.blockTypes as t (t.type)}
					<form method="POST" action="?/add" use:enhance>
						<input type="hidden" name="type" value={t.type} />
						<button class="btn btn-secondary !py-1 !text-xs">{t.label}</button>
					</form>
				{/each}
			</div>
		</section>

		<form method="POST" action="?/settings" use:enhance class="card !p-5 space-y-3">
			<h2 class="text-sm font-medium text-body">Page settings</h2>

			<div>
				<label class="label" for="title">Title</label>
				<input id="title" name="title" value={data.page.title} class="field" />
			</div>

			<div>
				<label class="label" for="slug">URL slug</label>
				<input id="slug" name="slug" value={data.page.slug} class="field" />
			</div>

			<div>
				<label class="label" for="status">Status</label>
				<select id="status" name="status" value={data.page.status} class="field">
					<option value="draft">Draft</option>
					<option value="published">Published</option>
				</select>
			</div>

			<div>
				<label class="label" for="unpublishAt">Take down at</label>
				<input
					id="unpublishAt"
					name="unpublishAt"
					type="datetime-local"
					value={data.page.unpublishAt ? new Date(data.page.unpublishAt).toISOString().slice(0, 16) : ''}
					class="field"
				/>
				<p class="hint mt-1">Sales end at midnight. Nobody should have to be awake for it.</p>
			</div>

			<details>
				<summary class="text-sm text-body">Advanced</summary>
				<div class="mt-3 space-y-3">
					<div>
						<label class="label" for="pixelId">Facebook pixel ID</label>
						<input id="pixelId" name="pixelId" value={data.page.pixelId ?? ''} class="field" />
						<p class="hint mt-1">A landing page you cannot attribute is one you cannot optimise.</p>
					</div>
					<div>
						<label class="label" for="metaTitle">Meta title</label>
						<input id="metaTitle" name="metaTitle" value={data.page.metaTitle ?? ''} maxlength="70" class="field" />
					</div>
					<div>
						<label class="label" for="metaDescription">Meta description</label>
						<textarea id="metaDescription" name="metaDescription" rows="3" maxlength="160" class="field">{data.page.metaDescription ?? ''}</textarea>
					</div>
				</div>
			</details>

			<button class="btn btn-primary w-full">Save settings</button>
		</form>
	</div>
</div>
