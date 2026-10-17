<script lang="ts">
	import type { components } from '#lib/api.js';
	import { runAction } from '#lib/admin/actions.js';
	import RowMenu from '#lib/admin/RowMenu.svelte';
	import StepForm from '#lib/admin/StepForm.svelte';
	import { admin as a, teamAdmin as t } from '#lib/copy.js';
	import AlertDialog from '#lib/sinaui/ui/AlertDialog.svelte';
	import Avatar from '#lib/sinaui/ui/Avatar.svelte';
	import Badge from '#lib/sinaui/ui/Badge.svelte';
	import Button from '#lib/sinaui/ui/Button.svelte';
	import Card from '#lib/sinaui/ui/Card.svelte';
	import Input from '#lib/sinaui/ui/Input.svelte';
	import PasswordInput from '#lib/sinaui/ui/PasswordInput.svelte';
	import RadioCards from '#lib/sinaui/ui/RadioCards.svelte';
	import Table from '#lib/sinaui/ui/Table.svelte';
	import { toast } from '#lib/sinaui/ui/toast/index.js';
	import type { PageProps } from './$types';

	type Member = components['schemas']['StaffMember'];
	let { data, form }: PageProps = $props();
	const fields = $derived(
		((form && 'fields' in form && form.fields) || {}) as Record<string, string>
	);
	const day = new Intl.DateTimeFormat('en-BD', { dateStyle: 'medium', timeZone: 'Asia/Dhaka' });

	let open = $state(false);
	let switching = $state<Member | null>(null);

	async function change(m: Member, role: string, disabled: boolean) {
		try {
			await runAction('update', { id: m.id, role, disabled: disabled ? '1' : '0' });
			toast.success(t.saved);
		} catch (e) {
			toast.error((e as Error).message);
		}
	}
</script>

<svelte:head><title>{t.title} · {data.store.name}</title></svelte:head>

<div class="head">
	<div>
		<h1>{t.title}</h1>
		<p>{t.description}</p>
	</div>
	<Button onclick={() => (open = true)}>{t.add}</Button>
</div>

<Card>
	<Table caption={t.title} hideCaption>
		<thead>
			<tr>
				<th scope="col">{t.name}</th>
				<th scope="col">{t.role}</th>
				<th scope="col">{t.statusCol}</th>
				<th scope="col">{t.joined}</th>
				<th scope="col"><span class="sr">{a.actions('')}</span></th>
			</tr>
		</thead>
		<tbody>
			{#each data.team as m (m.id)}
				<tr>
					<td>
						<span class="who">
							<Avatar name={m.name} size="sm" decorative />
							<span
								><strong>{m.name}</strong>
								<span class="muted"
									>{[m.email, m.phone?.replace(/^\+88/, '')].filter(Boolean).join(' · ')}</span
								></span
							>
							{#if m.you}<Badge icon={false}>{t.you}</Badge>{/if}
						</span>
					</td>
					<td
						><Badge tone={m.role === 'admin' ? 'accent' : 'neutral'} icon={false}
							>{t.roleLabel[m.role]}</Badge
						></td
					>
					<td>
						{#if m.disabled}<Badge tone="warning">{t.off}</Badge>{:else}<Badge
								tone="neutral"
								icon={false}>{t.on}</Badge
							>{/if}
					</td>
					<td class="muted-cell">{day.format(new Date(m.created_at))}</td>
					<td class="menu">
						{#if !m.you}
							<RowMenu
								label={a.actions(m.name)}
								actions={[
									m.role === 'admin'
										? { label: t.makeStaff, onselect: () => change(m, 'staff', m.disabled) }
										: { label: t.makeAdmin, onselect: () => change(m, 'admin', m.disabled) },
									m.disabled
										? { label: t.switchOn, onselect: () => change(m, m.role, false) }
										: {
												label: t.switchOff,
												danger: true,
												separate: true,
												onselect: () => (switching = m)
											}
								]}
							/>
						{/if}
					</td>
				</tr>
			{/each}
		</tbody>
	</Table>
</Card>

{#key open}
	<StepForm
		bind:open
		title={t.add}
		action="?/add"
		submitLabel={t.add}
		message={form && 'message' in form ? form.message : undefined}
		onsaved={() => toast.success(t.added)}
		steps={[
			{ label: t.stepWho, body: who },
			{ label: t.stepAccess, body: access }
		]}
	/>
{/key}

{#snippet who()}
	<Input
		label={t.name}
		name="name"
		placeholder={t.namePlaceholder}
		required
		maxlength={80}
		error={fields.name}
	/>
	<Input
		label={t.email}
		name="email"
		type="email"
		placeholder="nusrat@yourshop.com"
		required
		hint={t.emailHint}
		error={fields.email}
	/>
	<Input label={t.phone} name="phone" type="tel" placeholder="01712345678" error={fields.phone} />
{/snippet}

{#snippet access()}
	<RadioCards legend={t.role} name="role" value="staff" options={t.roles} />
	<PasswordInput
		label={t.password}
		name="password"
		placeholder={t.passwordPlaceholder}
		required
		minlength={12}
		autocomplete="new-password"
		hint={t.passwordHint}
		error={fields.password}
	/>
{/snippet}

{#if switching}
	<AlertDialog
		open
		title={t.switchOffTitle(switching.name)}
		description={t.switchOffBody}
		confirmLabel={t.switchOff}
		tone="danger"
		onconfirm={async () => {
			await runAction('update', { id: switching!.id, role: switching!.role, disabled: '1' });
			switching = null;
			toast.success(t.saved);
		}}
	/>
{/if}

<style>
	.who {
		display: flex;
		align-items: center;
		gap: 0.75rem;
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
