<script lang="ts">
	import { deserialize, enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import type { components } from '#lib/api.js';
	import { categories as t, errorText } from '#lib/copy.js';
	import Alert from '#lib/sinaui/ui/Alert.svelte';
	import Button from '#lib/sinaui/ui/Button.svelte';
	import Card from '#lib/sinaui/ui/Card.svelte';
	import ConfirmButton from '#lib/sinaui/ui/ConfirmButton.svelte';
	import Dialog from '#lib/sinaui/ui/Dialog.svelte';
	import EmptyState from '#lib/sinaui/ui/EmptyState.svelte';
	import ImageField from '#lib/admin/ImageField.svelte';
	import Input from '#lib/sinaui/ui/Input.svelte';
	import NumberField from '#lib/sinaui/ui/NumberField.svelte';
	import Select from '#lib/sinaui/ui/Select.svelte';
	import { toast } from '#lib/sinaui/ui/toast/index.js';
	import type { PageProps } from './$types';

	type Category = components['schemas']['Category'];

	let { data, form }: PageProps = $props();

	// Parents before children, each child indented under its parent.
	const tree = $derived.by(() => {
		const byParent = Map.groupBy(data.categories, (c) => c.parent_id ?? '');
		const out: { c: Category; depth: number }[] = [];
		const walk = (parent: string, depth: number) => {
			for (const c of byParent.get(parent) ?? []) {
				out.push({ c, depth });
				walk(c.id, depth + 1);
			}
		};
		walk('', 0);
		return out;
	});

	const fields = (action: string) =>
		(form?.action === action ? form.fields : undefined) as Record<string, string> | undefined;
	let editing = $state<Category | null>(null);
	let picture = $state<{ id: string; url: string } | null>(null);
	let editPicture = $state<{ id: string; url: string } | null>(null);
	let editOpen = $state(false);

	async function remove(id: string) {
		const body = new FormData();
		body.set('id', id);
		const res = await fetch('?/delete', {
			method: 'POST',
			body,
			headers: { 'x-sveltekit-action': 'true' }
		});
		const result = deserialize(await res.text());
		if (result.type === 'failure') {
			toast.error(String(result.data?.message ?? errorText('internal')));
			return;
		}
		toast.success(t.deleted);
		await invalidateAll();
	}
</script>

<svelte:head><title>{t.title} · {data.store.name}</title></svelte:head>

<div class="head">
	<h1>{t.title}</h1>
	<p>{t.description}</p>
</div>

{#snippet parentSelect(current: Category | null)}
	<Select label={t.parent} name="parent_id" value={current?.parent_id ?? ''}>
		<option value="">{t.topLevel}</option>
		{#each tree as { c, depth } (c.id)}
			{#if c.id !== current?.id}<option value={c.id}>{' '.repeat(depth) + c.name}</option>{/if}
		{/each}
	</Select>
{/snippet}

<div class="split">
	<Card title={t.add} level={2}>
		<form
			method="POST"
			action="?/create"
			class="add"
			use:enhance={() =>
				async ({ result, update }) => {
					await update();
					if (result.type === 'success') {
						picture = null;
						toast.success(t.saved);
					}
				}}
		>
			{#if form?.action === 'create' && form.message}<Alert
					tone="danger"
					title={form.message}
					live
				/>{/if}
			<Input label={t.name} name="name" required maxlength={80} error={fields('create')?.name} />
			{@render parentSelect(null)}
			<ImageField
				label={t.picture}
				hint={t.pictureHint}
				name="image_id"
				removeLabel={t.removePicture}
				bind:value={picture}
			/>
			<div><Button type="submit">{t.add}</Button></div>
		</form>
	</Card>

	<div class="list">
		{#if tree.length}
			<ul class="list" aria-label={t.caption}>
				{#each tree as { c, depth } (c.id)}
					<li style:--depth={depth}>
						<span class="name">{c.name}</span>
						<span class="slug">/{c.slug}</span>
						<Button
							variant="ghost"
							size="sm"
							onclick={() => {
								editing = c;
								editPicture = c.image ? { id: c.image.id, url: c.image.url } : null;
								editOpen = true;
							}}>{t.edit}</Button
						>
						<ConfirmButton size="sm" confirm={t.deleteConfirm} onconfirm={() => remove(c.id)}
							>{t.delete}</ConfirmButton
						>
					</li>
				{/each}
			</ul>
		{:else}
			<EmptyState title={t.emptyTitle}>{t.emptyBody}</EmptyState>
		{/if}
	</div>
</div>

<Dialog bind:open={editOpen} title={t.editTitle}>
	{#if editing}
		{#key editing.id}
			<form
				method="POST"
				action="?/update"
				class="add"
				use:enhance={() =>
					async ({ result, update }) => {
						await update({ reset: false });
						if (result.type === 'success') {
							editOpen = false;
							toast.success(t.saved);
						}
					}}
			>
				<input type="hidden" name="id" value={editing.id} />
				{#if form?.action === 'update' && form.message}<Alert
						tone="danger"
						title={form.message}
						live
					/>{/if}
				<Input
					label={t.name}
					name="name"
					value={editing.name}
					required
					maxlength={80}
					error={fields('update')?.name}
				/>
				{@render parentSelect(editing)}
				<ImageField
					label={t.picture}
					hint={t.pictureHint}
					name="image_id"
					removeLabel={t.removePicture}
					bind:value={editPicture}
				/>
				<NumberField
					label={t.position}
					name="position"
					value={editing.position}
					min={0}
					hint={t.positionHint}
				/>
				<div><Button type="submit">{t.save}</Button></div>
			</form>
		{/key}
	{/if}
</Dialog>

<style>
	.head {
		margin-block-end: 1.5rem;
	}
	h1 {
		margin: 0 0 0.25rem;
		font-size: 1.5rem;
	}
	.head p {
		margin: 0;
		color: var(--ui-muted);
	}
	.add {
		display: grid;
		gap: 1rem;
	}
	ul.list {
		display: grid;
		gap: 0.25rem;
		margin: 0;
		padding: 0;
		list-style: none;
	}
	li {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 0.75rem;
		padding-inline-start: calc(0.75rem + var(--depth) * 1.5rem);
		border-radius: var(--ui-radius);
		background: var(--ui-subtle);
	}
	.name {
		font-weight: 500;
	}
	.slug {
		flex: 1;
		color: var(--ui-muted);
		font-family: var(--ui-font-mono);
		font-size: 0.8125rem;
	}
</style>
