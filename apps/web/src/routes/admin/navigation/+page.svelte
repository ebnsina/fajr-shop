<script lang="ts">
	import { page } from '$app/state';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import { Delete02FreeIcons } from '@hugeicons/core-free-icons';
	import { enhance } from '$app/forms';

	let { data, form } = $props();

	let editing = $state<string | null>(null);

	const SLOTS = [
		{ value: 'home-top', label: 'Home — top' },
		{ value: 'home-mid', label: 'Home — middle' },
		{ value: 'category-top', label: 'Category pages' }
	];

	const local = (d: Date | string | null) => (d ? new Date(d).toISOString().slice(0, 16) : '');
	const day = (d: Date | string | null) =>
		d ? new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'Asia/Dhaka' }).format(new Date(d)) : '';
</script>

<svelte:head><title>Navigation · {page.data.storeName ?? 'Fajr Shop'}</title></svelte:head>

<h1 class="text-xl font-semibold tracking-tight text-strong">Navigation & banners</h1>
<p class="mt-1 text-sm text-muted">Menus and promotional images, editable without a deploy.</p>

{#if form?.error}
	<p class="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{form.error}</p>
{/if}

<div class="mt-6 grid gap-6 lg:grid-cols-2">
	<!-- menu -->
	<section class="card !p-5">
		<h2 class="mb-3 text-sm font-medium text-body">Main menu</h2>

		{#if data.items.length === 0}
			<p class="text-sm text-muted">
				No menu items — the storefront falls back to your top-level categories.
			</p>
		{:else}
			<ul class="mb-4 space-y-2">
				{#each data.items as item (item.id)}
					<li>
						<form method="POST" action="?/updateLink" use:enhance class="flex items-center gap-2">
							<input type="hidden" name="id" value={item.id} />
							<input name="sort" type="number" value={item.sort} class="field !w-14 !px-2 !py-1 !text-xs tabular-nums" title="Order" />
							<input name="label" value={item.label} class="field !py-1 !text-sm" onblur={(e) => e.currentTarget.form?.requestSubmit()} />
							<input name="href" value={item.href} class="field !py-1 font-mono !text-xs" onblur={(e) => e.currentTarget.form?.requestSubmit()} />
						</form>
					</li>
				{/each}
			</ul>
		{/if}

		<form method="POST" action="?/addLink" use:enhance class="flex flex-wrap gap-2">
			<input name="label" placeholder="Label" required class="field !w-32 !py-1.5" />
			<input name="href" placeholder="/c/sarees" required class="field !py-1.5 flex-1 font-mono !text-xs" />
			<button class="btn btn-secondary">Add</button>
		</form>
	</section>

	<!-- banners -->
	<section class="card !p-5">
		<div class="mb-3 flex items-center justify-between">
			<h2 class="text-sm font-medium text-body">Banners</h2>
			<button class="btn btn-secondary !py-1 !text-xs" onclick={() => (editing = editing === 'new' ? null : 'new')}>
				New banner
			</button>
		</div>

		{#if data.banners.length === 0 && editing !== 'new'}
			<p class="text-sm text-muted">No banners yet.</p>
		{:else}
			<ul class="space-y-2">
				{#each data.banners as b (b.id)}
					<li class="flex items-center gap-3 rounded-xl bg-hover p-2.5">
						<div class="min-w-0 flex-1">
							<p class="truncate text-sm font-medium text-strong">{b.name}</p>
							<p class="text-xs text-muted">
								{b.slot}
								{#if b.startsAt || b.endsAt}
									· {day(b.startsAt) || '…'} → {day(b.endsAt) || '…'}
								{/if}
								{#if !b.isActive}· off{/if}
							</p>
						</div>
						<button class="btn btn-ghost !py-1 !text-xs" onclick={() => (editing = editing === b.id ? null : b.id)}>
							Edit
						</button>
						<form method="POST" action="?/removeBanner" use:enhance>
							<input type="hidden" name="id" value={b.id} />
							<button class="btn btn-ghost !px-2 hover:!text-red-600" aria-label="Delete banner">
								<HugeiconsIcon icon={Delete02FreeIcons} size={15} strokeWidth={1.75} />
							</button>
						</form>
					</li>

					{#if editing === b.id}
						{@render bannerForm(b)}
					{/if}
				{/each}
			</ul>
		{/if}

		{#if editing === 'new'}
			{@render bannerForm(null)}
		{/if}
	</section>
</div>

{#snippet bannerForm(b: any)}
	<form method="POST" action="?/saveBanner" use:enhance class="mt-2 space-y-2 rounded-xl bg-hover p-3">
		{#if b}<input type="hidden" name="id" value={b.id} />{/if}

		<input name="name" placeholder="Internal name" value={b?.name ?? ''} required class="field !py-1.5" />

		<div class="flex gap-2">
			<select name="slot" value={b?.slot ?? 'home-top'} class="field !py-1.5">
				{#each SLOTS as s (s.value)}<option value={s.value}>{s.label}</option>{/each}
			</select>
			<select name="mediaId" value={b?.mediaId ?? ''} class="field !py-1.5">
				<option value="">No image</option>
				{#each data.media as m (m.id)}<option value={m.id}>{m.alt ?? m.id}</option>{/each}
			</select>
		</div>

		<input name="href" placeholder="Link, e.g. /p/eid-sale-2026" value={b?.href ?? ''} class="field !py-1.5 font-mono !text-xs" />
		<input name="alt" placeholder="Alt text" value={b?.alt ?? ''} class="field !py-1.5" />

		<div class="flex gap-2">
			<label class="flex-1">
				<span class="hint">Starts</span>
				<input name="startsAt" type="datetime-local" value={local(b?.startsAt ?? null)} class="field !py-1.5" />
			</label>
			<label class="flex-1">
				<span class="hint">Ends</span>
				<input name="endsAt" type="datetime-local" value={local(b?.endsAt ?? null)} class="field !py-1.5" />
			</label>
		</div>

		<label class="flex items-center gap-2 text-sm">
			<input type="checkbox" name="isActive" checked={b ? b.isActive : true} />
			Active
		</label>

		<button class="btn btn-primary w-full !py-1.5">Save banner</button>
	</form>
{/snippet}
