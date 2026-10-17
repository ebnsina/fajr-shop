<script lang="ts">
	import { deserialize, enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { apiKeys as t, errorText, keyScopes, permissions } from '#lib/copy.js';
	import Alert from '#lib/sinaui/ui/Alert.svelte';
	import Badge from '#lib/sinaui/ui/Badge.svelte';
	import Button from '#lib/sinaui/ui/Button.svelte';
	import Card from '#lib/sinaui/ui/Card.svelte';
	import Checkbox from '#lib/sinaui/ui/Checkbox.svelte';
	import ConfirmButton from '#lib/sinaui/ui/ConfirmButton.svelte';
	import CopyButton from '#lib/sinaui/ui/CopyButton.svelte';
	import EmptyState from '#lib/sinaui/ui/EmptyState.svelte';
	import Input from '#lib/sinaui/ui/Input.svelte';
	import Table from '#lib/sinaui/ui/Table.svelte';
	import { toast } from '#lib/sinaui/ui/toast/index.js';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const fields = $derived<Record<string, string>>(form?.fields ?? {});
	const date = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' });
	let creating = $state(false);

	async function revoke(id: string) {
		const body = new FormData();
		body.set('id', id);
		const res = await fetch('?/revoke', {
			method: 'POST',
			body,
			headers: { 'x-sveltekit-action': 'true' }
		});
		const result = deserialize(await res.text());
		if (result.type === 'failure') {
			toast.error(String(result.data?.message ?? errorText('internal')));
			return;
		}
		toast.success(t.revoked);
		await invalidateAll();
	}
</script>

<svelte:head><title>{t.title} · {data.store.name}</title></svelte:head>

<div class="head">
	<h1>{t.title}</h1>
	<p>{t.description}</p>
</div>

<div class="split">
	<div>
		{#if form && 'created' in form && form.created}
			<Alert tone="success" title={t.createdTitle} live>
				<p>{t.createdBody}</p>
				<div class="key">
					<code>{form.created.key}</code>
					<CopyButton value={form.created.key} size="sm">{t.copy}</CopyButton>
				</div>
			</Alert>
		{/if}

		<Card title={t.create} level={2}>
			<form
				method="POST"
				action="?/create"
				novalidate
				use:enhance={() => {
					creating = true;
					return async ({ update }) => {
						await update();
						creating = false;
					};
				}}
			>
				{#if form?.message}<Alert tone="danger" title={form.message} live />{/if}
				<Input
					label={t.name}
					name="name"
					maxlength={80}
					hint={t.nameHint}
					error={fields.name}
					required
				/>
				<fieldset>
					<legend>{t.scopes}</legend>
					{#each keyScopes as value (value)}
						<Checkbox name="scopes" {value} hint={permissions[value].hint}
							>{permissions[value].label}</Checkbox
						>
					{/each}
					{#if fields.scopes}<p class="error" role="alert">{fields.scopes}</p>{/if}
				</fieldset>
				<div class="actions"><Button type="submit" loading={creating}>{t.create}</Button></div>
			</form>
		</Card>
	</div>
	<div class="list">
		{#if data.keys.length}
			<Table caption={t.listCaption}>
				<thead>
					<tr>
						<th>{t.columns.name}</th>
						<th>{t.columns.key}</th>
						<th>{t.columns.access}</th>
						<th>{t.columns.created}</th>
						<th><span class="sr-only">{t.columns.actions}</span></th>
					</tr>
				</thead>
				<tbody>
					{#each data.keys as key (key.id)}
						<tr>
							<td>{key.name}</td>
							<td><code>…{key.hint}</code></td>
							<td class="scopes">
								{#each key.scopes as s (s)}<Badge icon={false}>{permissions[s].label}</Badge>{/each}
							</td>
							<td>{date.format(new Date(key.created_at))}</td>
							<td>
								<ConfirmButton size="sm" confirm={t.revokeConfirm} onconfirm={() => revoke(key.id)}>
									{t.revoke}
								</ConfirmButton>
							</td>
						</tr>
					{/each}
				</tbody>
			</Table>
		{:else}
			<EmptyState title={t.emptyTitle}>{t.emptyBody}</EmptyState>
		{/if}
	</div>
</div>

<style>
	.head h1 {
		margin: 0 0 0.25rem;
		font-size: 1.5rem;
	}
	.head p {
		margin: 0;
		color: var(--ui-muted);
	}
	.head {
		margin-block-end: 1.5rem;
	}
	form,
	fieldset {
		display: grid;
		gap: 1rem;
	}
	fieldset {
		margin: 0;
		padding: 0;
		border: 0;
	}
	legend {
		margin-block-end: 0.75rem;
		font-weight: 500;
	}
	.error {
		margin: 0;
		color: var(--ui-danger);
		font-size: 0.875rem;
	}
	.actions {
		display: flex;
		justify-content: end;
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
	.scopes {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem;
	}
	.sr-only {
		position: absolute;
		inline-size: 1px;
		block-size: 1px;
		overflow: hidden;
		clip-path: inset(50%);
		white-space: nowrap;
	}
	.split > :first-child {
		display: grid;
		gap: 1rem;
	}
</style>
