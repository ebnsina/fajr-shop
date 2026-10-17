<script lang="ts">
	import type { components } from '#lib/api.js';
	import { runAction } from '#lib/admin/actions.js';
	import RowMenu from '#lib/admin/RowMenu.svelte';
	import StepForm from '#lib/admin/StepForm.svelte';
	import { admin as a, integrations as t } from '#lib/copy.js';
	import Badge from '#lib/sinaui/ui/Badge.svelte';
	import Card from '#lib/sinaui/ui/Card.svelte';
	import Input from '#lib/sinaui/ui/Input.svelte';
	import PasswordInput from '#lib/sinaui/ui/PasswordInput.svelte';
	import RadioCards from '#lib/sinaui/ui/RadioCards.svelte';
	import Switch from '#lib/sinaui/ui/Switch.svelte';
	import Table from '#lib/sinaui/ui/Table.svelte';
	import { toast } from '#lib/sinaui/ui/toast/index.js';
	import type { PageProps } from './$types';

	type Provider = components['schemas']['Provider'];
	let { data, form }: PageProps = $props();
	const fields = $derived<Record<string, string>>((form && 'fields' in form && form.fields) || {});
	const day = new Intl.DateTimeFormat('en-BD', { dateStyle: 'medium', timeZone: 'Asia/Dhaka' });
	const kinds = ['courier', 'payment', 'sms'] as const;

	let editing = $state<Provider | null>(null);
	let open = $state(false);

	function edit(p: Provider) {
		editing = p;
		open = true;
	}

	async function toggle(p: Provider) {
		try {
			await runAction('toggle', {
				code: p.code,
				enabled: p.enabled ? '0' : '1',
				live: p.live ? '1' : '0'
			});
			toast.success(p.enabled ? t.switchedOff(p.name) : t.switchedOn(p.name));
		} catch (e) {
			toast.error((e as Error).message);
		}
	}
</script>

<svelte:head><title>{t.title} · {data.store.name}</title></svelte:head>

<div class="head">
	<h1>{t.title}</h1>
	<p>{t.description}</p>
</div>

<div class="kinds">
	{#each kinds as kind (kind)}
		<Card>
			<h2>{t.kinds[kind].title}</h2>
			<p class="muted">{t.kinds[kind].body}</p>
			<Table caption={t.kinds[kind].title} hideCaption>
				<thead>
					<tr>
						<th scope="col" class="w-name">{t.columns.name}</th>
						<th scope="col" class="w-col">{t.columns.status}</th>
						<th scope="col" class="w-col">{t.columns.mode}</th>
						<th scope="col">{t.columns.updated}</th>
						<th scope="col"><span class="sr">{a.actions('')}</span></th>
					</tr>
				</thead>
				<tbody>
					{#each data.providers.filter((p) => p.kind === kind) as p (p.code)}
						<tr>
							<td><strong>{p.name}</strong></td>
							<td>
								{#if !p.configured}<Badge icon={false}>{t.notSetUp}</Badge>
								{:else if p.enabled}<Badge tone="accent">{t.on}</Badge>
								{:else}<Badge tone="warning">{t.off}</Badge>{/if}
							</td>
							<td class="muted">{p.configured ? (p.live ? t.live : t.test) : '—'}</td>
							<td class="muted">{p.updated_at ? day.format(new Date(p.updated_at)) : '—'}</td>
							<td class="menu">
								<RowMenu
									label={a.actions(p.name)}
									actions={[
										{ label: p.configured ? t.edit : t.setUp, onselect: () => edit(p) },
										...(p.configured
											? [
													{
														label: p.enabled ? t.switchOff : t.switchOn,
														danger: p.enabled,
														separate: true,
														onselect: () => toggle(p)
													}
												]
											: [])
									]}
								/>
							</td>
						</tr>
					{/each}
				</tbody>
			</Table>
		</Card>
	{/each}
</div>

{#if editing}
	{@const p = editing}
	{#key p.code + open}
		<StepForm
			bind:open
			title={t.dialogTitle(p.name)}
			action="?/save"
			submitLabel={t.save}
			message={form && 'message' in form ? form.message : undefined}
			onsaved={() => toast.success(t.saved(p.name))}
			steps={[
				{ label: t.stepKeys, body: keys },
				{ label: t.stepMode, body: mode }
			]}
		/>
	{/key}

	{#snippet keys()}
		<input type="hidden" name="code" value={p.code} />
		<p class="muted">{t.keysHint(p.name)}</p>
		{#each p.fields as f (f.key)}
			{#if f.secret}
				<PasswordInput
					label={f.label}
					name="v.{f.key}"
					autocomplete="off"
					placeholder={f.set ? t.secretKept : t.secretNew(p.name)}
					required={!f.set && !f.optional}
					error={fields[f.key]}
				/>
			{:else}
				<Input
					label={f.label}
					name="v.{f.key}"
					autocomplete="off"
					value={f.value ?? ''}
					placeholder={t.secretNew(p.name)}
					required={!f.optional}
					error={fields[f.key]}
				/>
			{/if}
		{/each}
	{/snippet}

	{#snippet mode()}
		<RadioCards
			legend={t.mode}
			name="live"
			value={p.live ? 'live' : 'test'}
			options={[
				{ value: 'test', label: t.modeTest, description: t.modeTestBody },
				{ value: 'live', label: t.modeLive, description: t.modeLiveBody }
			]}
		/>
		<Switch name="enabled" checked={p.enabled || !p.configured}>
			{t.use(p.name)}
		</Switch>
		<p class="muted">{t.useHint}</p>
	{/snippet}
{/if}

<style>
	.head {
		margin-block-end: 1.5rem;
	}
	h1 {
		margin: 0;
		font-size: 1.5rem;
	}
	.head p {
		margin: 0.25rem 0 0;
		color: var(--text-secondary);
	}
	.kinds {
		display: grid;
		gap: 1rem;
	}
	h2 {
		margin: 0;
		font-size: 1.0625rem;
	}
	.muted {
		margin: 0;
		color: var(--text-secondary);
	}
	.kinds .muted {
		margin-block-end: 0.75rem;
	}
	/* The same widths in every card, so the three tables line up. */
	.w-name {
		inline-size: 30%;
	}
	.w-col {
		inline-size: 20%;
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
