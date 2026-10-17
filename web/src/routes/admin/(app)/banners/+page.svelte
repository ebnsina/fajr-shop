<script lang="ts">
	import type { components } from '#lib/api.js';
	import { runAction } from '#lib/admin/actions.js';
	import ImageField from '#lib/admin/ImageField.svelte';
	import RowMenu from '#lib/admin/RowMenu.svelte';
	import StepForm from '#lib/admin/StepForm.svelte';
	import { admin as a, banners as t, ph } from '#lib/copy.js';
	import AlertDialog from '#lib/sinaui/ui/AlertDialog.svelte';
	import Badge from '#lib/sinaui/ui/Badge.svelte';
	import Button from '#lib/sinaui/ui/Button.svelte';
	import Card from '#lib/sinaui/ui/Card.svelte';
	import EmptyState from '#lib/sinaui/ui/EmptyState.svelte';
	import Input from '#lib/sinaui/ui/Input.svelte';
	import NumberField from '#lib/sinaui/ui/NumberField.svelte';
	import RadioCards from '#lib/sinaui/ui/RadioCards.svelte';
	import Switch from '#lib/sinaui/ui/Switch.svelte';
	import Table from '#lib/sinaui/ui/Table.svelte';
	import { toast } from '#lib/sinaui/ui/toast/index.js';
	import type { PageProps } from './$types';

	type Banner = components['schemas']['Banner'];
	let { data, form }: PageProps = $props();

	const order = { hero: 0, side: 1, wide: 2 } as const;
	const placements = (['hero', 'side', 'wide'] as const).map((value) => ({
		value,
		label: t.placements[value].label,
		description: t.placements[value].hint
	}));
	// Grouped by where they go, then in their order.
	const rows = $derived(
		[...data.banners].sort(
			(x, y) => order[x.placement] - order[y.placement] || x.position - y.position
		)
	);
	const fields = $derived(
		((form && 'fields' in form && form.fields) || {}) as Record<string, string>
	);

	let open = $state(false);
	let editing = $state<Banner | null>(null);
	let picture = $state<{ id: string; url: string } | null>(null);
	let removing = $state<Banner | null>(null);

	function show(b: Banner | null) {
		editing = b;
		picture = b ? { id: b.image.id, url: b.image.url } : null;
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

{#if rows.length}
	<Card>
		<Table caption={t.title} hideCaption>
			<thead>
				<tr>
					<th scope="col">{t.picture}</th>
					<th scope="col">{t.alt}</th>
					<th scope="col">{t.placement}</th>
					<th scope="col" class="num">{t.position}</th>
					<th scope="col">{t.statusCol}</th>
					<th scope="col"><span class="sr">{a.actions('')}</span></th>
				</tr>
			</thead>
			<tbody>
				{#each rows as b (b.id)}
					<tr>
						<td
							><img
								class="pic"
								src={b.image.url}
								alt=""
								width="96"
								height="48"
								loading="lazy"
							/></td
						>
						<td>
							<strong>{b.alt}</strong>
							{#if b.link}<span class="muted">{b.link}</span>{/if}
						</td>
						<td>{t.placements[b.placement].label}</td>
						<td class="num">{b.position}</td>
						<td>
							<Badge tone={b.active ? 'accent' : 'neutral'} icon={false}
								>{b.active ? t.shown : t.hidden}</Badge
							>
						</td>
						<td class="menu">
							<RowMenu
								label={a.actions(b.alt)}
								actions={[
									{ label: a.edit, onselect: () => show(b) },
									{ label: a.delete, danger: true, separate: true, onselect: () => (removing = b) }
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
			{ label: t.picture, body: image },
			{ label: t.placement, body: place },
			{ label: t.stepWords, body: words }
		]}
	/>
{/key}

{#snippet image()}
	{#if editing}<input type="hidden" name="id" value={editing.id} />{/if}
	<ImageField
		label={t.picture}
		hint={t.pictureHint}
		name="image_id"
		removeLabel={a.delete}
		bind:value={picture}
		error={fields.image_id}
	/>
{/snippet}

{#snippet place()}
	<RadioCards
		legend={t.placement}
		name="placement"
		layout="list"
		options={placements}
		value={editing?.placement ?? 'hero'}
	/>
	<NumberField label={t.position} name="position" value={editing?.position ?? 0} min={0} />
	<Switch name="active" checked={editing?.active ?? true}>{t.active}</Switch>
{/snippet}

{#snippet words()}
	<Input
		label={t.alt}
		placeholder={ph.bannerAlt}
		name="alt"
		value={editing?.alt}
		required
		maxlength={200}
		hint={t.altHint}
		error={fields.alt}
	/>
	<Input
		label={t.link}
		placeholder={ph.bannerLink}
		name="link"
		value={editing?.link}
		maxlength={500}
		hint={t.linkHint}
		error={fields.link}
	/>
{/snippet}

{#if removing}
	<AlertDialog
		open
		title={a.deleteTitle(removing.alt)}
		description={a.deleteBody}
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
	.pic {
		display: block;
		inline-size: 6rem;
		block-size: 3rem;
		border-radius: 0.5rem;
		object-fit: cover;
	}
	.muted {
		display: block;
		color: var(--text-secondary);
		font-size: 0.8125rem;
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
