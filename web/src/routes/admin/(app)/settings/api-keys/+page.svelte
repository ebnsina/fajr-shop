<script lang="ts">
	import type { components } from '#lib/api.js';
	import { runAction } from '#lib/admin/actions.js';
	import RowMenu from '#lib/admin/RowMenu.svelte';
	import StepForm from '#lib/admin/StepForm.svelte';
	import { admin as a, apiKeys as t, keyScopes, permissions, ph } from '#lib/copy.js';
	import Alert from '#lib/sinaui/ui/Alert.svelte';
	import AlertDialog from '#lib/sinaui/ui/AlertDialog.svelte';
	import Badge from '#lib/sinaui/ui/Badge.svelte';
	import Button from '#lib/sinaui/ui/Button.svelte';
	import Card from '#lib/sinaui/ui/Card.svelte';
	import Checkbox from '#lib/sinaui/ui/Checkbox.svelte';
	import CopyButton from '#lib/sinaui/ui/CopyButton.svelte';
	import EmptyState from '#lib/sinaui/ui/EmptyState.svelte';
	import Input from '#lib/sinaui/ui/Input.svelte';
	import Table from '#lib/sinaui/ui/Table.svelte';
	import { toast } from '#lib/sinaui/ui/toast/index.js';
	import type { PageProps } from './$types';

	type Key = components['schemas']['ApiKey'];
	let { data, form }: PageProps = $props();
	const fields = $derived<Record<string, string>>((form && 'fields' in form && form.fields) || {});
	const day = new Intl.DateTimeFormat('en-BD', { dateStyle: 'medium', timeZone: 'Asia/Dhaka' });

	let open = $state(false);
	let revoking = $state<Key | null>(null);
</script>

<svelte:head><title>{t.title} · {data.store.name}</title></svelte:head>

<div class="head">
	<div>
		<h1>{t.title}</h1>
		<p>{t.description}</p>
	</div>
	<Button onclick={() => (open = true)}>{t.create}</Button>
</div>

{#if form && 'created' in form && form.created}
	<div class="created">
		<Alert tone="success" title={t.createdTitle} live>
			{t.createdBody}
			<span class="key">
				<code>{form.created.key}</code>
				<CopyButton value={form.created.key} size="sm">{t.copy}</CopyButton>
			</span>
		</Alert>
	</div>
{/if}

{#if data.keys.length}
	<Card>
		<Table caption={t.listCaption} hideCaption>
			<thead>
				<tr>
					<th scope="col">{t.columns.name}</th>
					<th scope="col">{t.columns.key}</th>
					<th scope="col">{t.columns.access}</th>
					<th scope="col">{t.columns.created}</th>
					<th scope="col"><span class="sr">{t.columns.actions}</span></th>
				</tr>
			</thead>
			<tbody>
				{#each data.keys as key (key.id)}
					<tr>
						<td><strong>{key.name}</strong></td>
						<td><code>…{key.hint}</code></td>
						<td class="scopes">
							{#each key.scopes as s (s)}<Badge icon={false}>{permissions[s].label}</Badge>{/each}
						</td>
						<td class="muted">{day.format(new Date(key.created_at))}</td>
						<td class="menu">
							<RowMenu
								label={a.actions(key.name)}
								actions={[{ label: t.revoke, danger: true, onselect: () => (revoking = key) }]}
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
		{#snippet actions()}<Button onclick={() => (open = true)}>{t.create}</Button>{/snippet}
	</EmptyState>
{/if}

{#key open}
	<StepForm
		bind:open
		title={t.create}
		action="?/create"
		submitLabel={t.create}
		message={form && 'message' in form ? form.message : undefined}
		steps={[
			{ label: t.stepName, body: name },
			{ label: t.scopes, body: scopes }
		]}
	/>
{/key}

{#snippet name()}
	<Input
		label={t.name}
		placeholder={ph.apiKeyName}
		name="name"
		maxlength={80}
		hint={t.nameHint}
		error={fields.name}
		required
	/>
{/snippet}

{#snippet scopes()}
	<fieldset>
		<legend>{t.scopes}</legend>
		{#each keyScopes as value (value)}
			<Checkbox name="scopes" {value} hint={permissions[value].hint}
				>{permissions[value].label}</Checkbox
			>
		{/each}
	</fieldset>
	{#if fields.scopes}<Alert tone="danger" title={fields.scopes} />{/if}
{/snippet}

{#if revoking}
	<AlertDialog
		open
		title={t.revokeTitle(revoking.name)}
		description={t.revokeBody}
		confirmLabel={t.revoke}
		tone="danger"
		onconfirm={async () => {
			await runAction('revoke', { id: revoking!.id });
			revoking = null;
			toast.success(t.revoked);
		}}
	/>
{/if}

<style>
	.created {
		margin-block-end: 1rem;
	}
	.key {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.5rem;
		margin-block-start: 0.5rem;
	}
	code {
		font-family: var(--ui-font-mono);
		overflow-wrap: anywhere;
	}
	fieldset {
		display: grid;
		gap: 0.75rem;
		margin: 0;
		padding: 0;
		border: 0;
	}
	legend {
		margin-block-end: 0.5rem;
		padding: 0;
		font-weight: 500;
	}
	.scopes {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem;
	}
	.muted {
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
