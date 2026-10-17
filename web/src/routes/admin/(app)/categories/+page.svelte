<script lang="ts">
	import type { components } from '#lib/api.js';
	import { runAction } from '#lib/admin/actions.js';
	import ImageField from '#lib/admin/ImageField.svelte';
	import RowMenu from '#lib/admin/RowMenu.svelte';
	import StepForm from '#lib/admin/StepForm.svelte';
	import { admin as a, categories as t, picker, ph } from '#lib/copy.js';
	import AlertDialog from '#lib/sinaui/ui/AlertDialog.svelte';
	import Button from '#lib/sinaui/ui/Button.svelte';
	import Card from '#lib/sinaui/ui/Card.svelte';
	import CustomSelect from '#lib/sinaui/ui/CustomSelect.svelte';
	import EmptyState from '#lib/sinaui/ui/EmptyState.svelte';
	import Input from '#lib/sinaui/ui/Input.svelte';
	import NumberField from '#lib/sinaui/ui/NumberField.svelte';
	import Table from '#lib/sinaui/ui/Table.svelte';
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
	const nameOf = (id?: string | null) => data.categories.find((c) => c.id === id)?.name;
	const fields = $derived(
		((form && 'fields' in form && form.fields) || {}) as Record<string, string>
	);

	let open = $state(false);
	let editing = $state<Category | null>(null);
	let picture = $state<{ id: string; url: string } | null>(null);
	let removing = $state<Category | null>(null);

	function show(c: Category | null) {
		editing = c;
		picture = c?.image ? { id: c.image.id, url: c.image.url } : null;
		open = true;
	}
</script>

<svelte:head><title>{t.title} · {data.store.name}</title></svelte:head>

<div class="head">
	<div>
		<h1>{t.title}</h1>
		<p>{t.description}</p>
	</div>
	<Button onclick={() => show(null)}>{t.add}</Button>
</div>

{#if tree.length}
	<Card>
		<Table caption={t.caption} hideCaption>
			<thead>
				<tr>
					<th scope="col">{t.name}</th>
					<th scope="col">{t.parent}</th>
					<th scope="col" class="num">{t.position}</th>
					<th scope="col"><span class="sr">{a.actions('')}</span></th>
				</tr>
			</thead>
			<tbody>
				{#each tree as { c, depth } (c.id)}
					<tr>
						<td>
							<span class="cat" style:--depth={depth}>
								{#if c.image}<img src={c.image.url} alt="" width="32" height="32" loading="lazy" />
								{:else}<span class="thumb" aria-hidden="true"></span>{/if}
								<span><strong>{c.name}</strong><span class="muted">/c/{c.slug}</span></span>
							</span>
						</td>
						<td class="muted-cell">{nameOf(c.parent_id) ?? t.topLevel}</td>
						<td class="num">{c.position}</td>
						<td class="menu">
							<RowMenu
								label={a.actions(c.name)}
								actions={[
									{ label: a.edit, onselect: () => show(c) },
									{ label: t.view, href: `/c/${c.slug}` },
									{ label: a.delete, danger: true, separate: true, onselect: () => (removing = c) }
								]}
							/>
						</td>
					</tr>
				{/each}
			</tbody>
		</Table>
	</Card>
{:else}
	<EmptyState title={t.emptyTitle}>
		{t.emptyBody}
		{#snippet actions()}<Button onclick={() => show(null)}>{t.add}</Button>{/snippet}
	</EmptyState>
{/if}

{#key editing?.id ?? 'new'}
	<StepForm
		bind:open
		title={editing ? t.editTitle : t.add}
		action={editing ? '?/update' : '?/create'}
		submitLabel={editing ? t.save : t.add}
		message={form && 'message' in form ? form.message : undefined}
		onsaved={() => toast.success(t.saved)}
		steps={[
			{ label: t.stepCategory, body: details },
			{ label: t.picture, body: image }
		]}
	/>
{/key}

{#snippet details()}
	{#if editing}<input type="hidden" name="id" value={editing.id} />{/if}
	<Input
		label={t.name}
		placeholder={ph.categoryName}
		name="name"
		value={editing?.name}
		required
		maxlength={80}
		error={fields.name}
	/>
	<CustomSelect
		label={t.parent}
		name="parent_id"
		value={editing?.parent_id ?? ''}
		placeholder={t.topLevel}
		searchable
		searchLabel={picker.searchCategories}
		empty={picker.noCategory}
		options={[
			{ value: '', label: t.topLevel },
			...tree
				.filter(({ c }) => c.id !== editing?.id)
				.map(({ c }) => ({ value: c.id, label: c.name, description: nameOf(c.parent_id) }))
		]}
	/>
	<NumberField
		label={t.position}
		name="position"
		value={editing?.position ?? 0}
		min={0}
		hint={t.positionHint}
	/>
{/snippet}

{#snippet image()}
	<ImageField
		label={t.picture}
		hint={t.pictureHint}
		name="image_id"
		removeLabel={t.removePicture}
		bind:value={picture}
	/>
{/snippet}

{#if removing}
	<AlertDialog
		open
		title={a.deleteTitle(removing.name)}
		description={t.deleteBody}
		confirmLabel={a.delete}
		tone="danger"
		onconfirm={async () => {
			await runAction('delete', { id: removing!.id });
			removing = null;
			toast.success(t.deleted);
		}}
	/>
{/if}

<style>
	.cat {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding-inline-start: calc(var(--depth) * 1.75rem);
	}
	.cat img,
	.thumb {
		flex: none;
		inline-size: 2rem;
		block-size: 2rem;
		border-radius: 0.5rem;
		object-fit: cover;
		background: var(--bg-subtle);
	}
	.muted {
		display: block;
		color: var(--text-secondary);
		font-size: 0.8125rem;
	}
	.muted-cell {
		color: var(--text-secondary);
	}
	.menu {
		inline-size: 1%;
	}
	.sr {
		position: absolute;
		inline-size: 1px;
		block-size: 1px;
		overflow: hidden;
		clip-path: inset(50%);
	}
</style>
