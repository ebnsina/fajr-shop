<script lang="ts">
	import { deserialize, enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import type { components } from '#lib/api.js';
	import ImageField from '#lib/admin/ImageField.svelte';
	import { banners as t, errorText } from '#lib/copy.js';
	import Alert from '#lib/sinaui/ui/Alert.svelte';
	import Badge from '#lib/sinaui/ui/Badge.svelte';
	import Button from '#lib/sinaui/ui/Button.svelte';
	import Card from '#lib/sinaui/ui/Card.svelte';
	import ConfirmButton from '#lib/sinaui/ui/ConfirmButton.svelte';
	import Dialog from '#lib/sinaui/ui/Dialog.svelte';
	import EmptyState from '#lib/sinaui/ui/EmptyState.svelte';
	import Input from '#lib/sinaui/ui/Input.svelte';
	import NumberField from '#lib/sinaui/ui/NumberField.svelte';
	import RadioCards from '#lib/sinaui/ui/RadioCards.svelte';
	import Switch from '#lib/sinaui/ui/Switch.svelte';
	import { toast } from '#lib/sinaui/ui/toast/index.js';
	import type { PageProps } from './$types';

	type Banner = components['schemas']['Banner'];
	let { data, form }: PageProps = $props();

	const placements = (['hero', 'side', 'wide'] as const).map((value) => ({
		value,
		label: t.placements[value].label
	}));
	const fields = (action: string) =>
		(form?.action === action ? form.fields : {}) as Record<string, string>;
	const groups = $derived(
		(['hero', 'side', 'wide'] as const)
			.map((p) => ({ p, items: data.banners.filter((b) => b.placement === p) }))
			.filter((g) => g.items.length)
	);

	let picture = $state<{ id: string; url: string } | null>(null);
	let editing = $state<Banner | null>(null);
	let editPicture = $state<{ id: string; url: string } | null>(null);
	let editOpen = $state(false);

	function edit(b: Banner) {
		editing = b;
		editPicture = { id: b.image.id, url: b.image.url };
		editOpen = true;
	}

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

{#snippet bannerFields(b: Banner | null, action: string)}
	<RadioCards
		legend={t.placement}
		name="placement"
		options={placements}
		hint={t.placementHint}
		value={b?.placement ?? 'hero'}
	/>
	<Input
		label={t.alt}
		name="alt"
		value={b?.alt}
		required
		maxlength={200}
		hint={t.altHint}
		error={fields(action).alt}
	/>
	<Input
		label={t.link}
		name="link"
		value={b?.link}
		maxlength={500}
		hint={t.linkHint}
		error={fields(action).link}
	/>
	<NumberField label={t.position} name="position" value={b?.position ?? 0} min={0} />
	<Switch name="active" checked={b?.active ?? true}>{t.active}</Switch>
{/snippet}

<div class="split">
	<Card title={t.add} level={2}>
		<form
			method="POST"
			action="?/create"
			class="form"
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
			<ImageField
				label={t.picture}
				hint={t.pictureHint}
				name="image_id"
				removeLabel={t.delete}
				bind:value={picture}
				error={fields('create').image_id}
			/>
			{@render bannerFields(null, 'create')}
			<div><Button type="submit">{t.add}</Button></div>
		</form>
	</Card>

	<div class="list">
		{#if groups.length}
			{#each groups as g (g.p)}
				<section class="group" aria-labelledby="g-{g.p}">
					<h2 id="g-{g.p}">{t.placements[g.p].label}</h2>
					<ul>
						{#each g.items as b (b.id)}
							<li>
								<img src={b.image.url} alt="" />
								<div class="info">
									<span class="alt">{b.alt}</span>
									{#if b.link}<span class="link">{b.link}</span>{/if}
									{#if !b.active}<Badge icon={false}>{t.hidden}</Badge>{/if}
								</div>
								<Button variant="ghost" size="sm" onclick={() => edit(b)}>{t.edit}</Button>
								<ConfirmButton size="sm" confirm={t.deleteConfirm} onconfirm={() => remove(b.id)}
									>{t.delete}</ConfirmButton
								>
							</li>
						{/each}
					</ul>
				</section>
			{/each}
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
				class="form"
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
				<ImageField
					label={t.picture}
					hint={t.pictureHint}
					name="image_id"
					removeLabel={t.delete}
					bind:value={editPicture}
					error={fields('update').image_id}
				/>
				{@render bannerFields(editing, 'update')}
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
	.form {
		display: grid;
		gap: 1rem;
	}
	.group + .group {
		margin-block-start: 1.5rem;
	}
	.group h2 {
		margin: 0 0 0.5rem;
		font-size: 1rem;
	}
	ul {
		display: grid;
		gap: 0.5rem;
		margin: 0;
		padding: 0;
		list-style: none;
	}
	li {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.75rem;
		padding: 0.5rem;
		border-radius: var(--ui-radius);
		background: var(--ui-subtle);
	}
	li img {
		inline-size: 7rem;
		aspect-ratio: 2 / 1;
		border-radius: calc(var(--ui-radius) / 2);
		object-fit: cover;
	}
	.info {
		display: grid;
		flex: 1;
		gap: 0.125rem;
		min-inline-size: 10rem;
	}
	.alt {
		font-weight: 500;
	}
	.link {
		color: var(--ui-muted);
		font-family: var(--ui-font-mono);
		font-size: 0.8125rem;
	}
</style>
