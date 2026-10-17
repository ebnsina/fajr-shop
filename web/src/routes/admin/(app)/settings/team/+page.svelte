<script lang="ts">
	import { enhance } from '$app/forms';
	import { teamAdmin as t } from '#lib/copy.js';
	import Alert from '#lib/sinaui/ui/Alert.svelte';
	import Badge from '#lib/sinaui/ui/Badge.svelte';
	import Button from '#lib/sinaui/ui/Button.svelte';
	import Card from '#lib/sinaui/ui/Card.svelte';
	import ConfirmButton from '#lib/sinaui/ui/ConfirmButton.svelte';
	import Input from '#lib/sinaui/ui/Input.svelte';
	import PasswordInput from '#lib/sinaui/ui/PasswordInput.svelte';
	import RadioCards from '#lib/sinaui/ui/RadioCards.svelte';
	import { toast } from '#lib/sinaui/ui/toast/index.js';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const fields = (action: string) =>
		((form?.action === action && form.fields) || {}) as Record<string, string>;
	const day = new Intl.DateTimeFormat('en-BD', { dateStyle: 'medium', timeZone: 'Asia/Dhaka' });
	// Switching someone off asks first, then submits that row's own form.
	const offForms: Record<string, HTMLFormElement> = {};
	let added = $state(0);

	const done =
		(msg: string, reset = false) =>
		() =>
		async ({
			result,
			update
		}: {
			result: { type: string };
			update: (o?: { reset?: boolean }) => Promise<void>;
		}) => {
			await update({ reset });
			if (result.type === 'success') toast.success(msg);
			else if (result.type === 'failure' && form?.message) toast.error(form.message);
		};
</script>

<svelte:head><title>{t.title} · {data.store.name}</title></svelte:head>

<div class="head">
	<h1>{t.title}</h1>
	<p>{t.description}</p>
</div>

<div class="split">
	<Card title={t.add} level={2}>
		<!-- Drawn fresh after each add, so every field (the role too) is back to its start. -->
		{#key added}
			<form
				method="POST"
				action="?/add"
				class="form"
				use:enhance={() =>
					async ({ result, update }) => {
						await update({ reset: false });
						if (result.type === 'success') {
							added++;
							toast.success(t.added);
						}
					}}
			>
				{#if form?.action === 'add' && form.message}<Alert
						tone="danger"
						title={form.message}
						live
					/>{/if}
				<Input
					label={t.name}
					name="name"
					placeholder={t.namePlaceholder}
					required
					maxlength={80}
					error={fields('add').name}
				/>
				<Input
					label={t.email}
					name="email"
					type="email"
					placeholder="nusrat@yourshop.com"
					required
					hint={t.emailHint}
					error={fields('add').email}
				/>
				<Input
					label={t.phone}
					name="phone"
					type="tel"
					placeholder="01712345678"
					error={fields('add').phone}
				/>
				<RadioCards legend={t.role} name="role" value="staff" options={t.roles} />
				<PasswordInput
					label={t.password}
					name="password"
					placeholder={t.passwordPlaceholder}
					required
					minlength={12}
					autocomplete="new-password"
					hint={t.passwordHint}
					error={fields('add').password}
				/>
				<div><Button type="submit">{t.add}</Button></div>
			</form>
		{/key}
	</Card>

	<ul class="team">
		{#each data.team as m (m.id)}
			<li class={[m.disabled && 'off']}>
				<div class="who">
					<p class="name">
						{m.name}
						<Badge tone={m.role === 'admin' ? 'accent' : 'neutral'} icon={false}
							>{t.roleLabel[m.role]}</Badge
						>
						{#if m.you}<Badge icon={false}>{t.you}</Badge>{/if}
						{#if m.disabled}<Badge tone="warning">{t.off}</Badge>{/if}
					</p>
					<p class="muted">
						{[m.email, m.phone?.replace(/^\+88/, '')].filter(Boolean).join(' · ')} · {day.format(
							new Date(m.created_at)
						)}
					</p>
				</div>
				{#if !m.you}
					<div class="buttons">
						<form method="POST" action="?/update" use:enhance={done(t.saved)}>
							<input type="hidden" name="id" value={m.id} />
							<input type="hidden" name="disabled" value={m.disabled ? '1' : '0'} />
							<Button
								type="submit"
								variant="ghost"
								size="sm"
								name="role"
								value={m.role === 'admin' ? 'staff' : 'admin'}
								>{m.role === 'admin' ? t.makeStaff : t.makeAdmin}</Button
							>
						</form>
						<form
							method="POST"
							action="?/update"
							bind:this={offForms[m.id]}
							use:enhance={done(t.saved)}
						>
							<input type="hidden" name="id" value={m.id} />
							<input type="hidden" name="role" value={m.role} />
							<input type="hidden" name="disabled" value={m.disabled ? '0' : '1'} />
							{#if m.disabled}
								<Button type="submit" variant="secondary" size="sm">{t.switchOn}</Button>
							{:else}
								<ConfirmButton
									size="sm"
									confirm={t.switchOffConfirm}
									onconfirm={() => offForms[m.id]?.requestSubmit()}>{t.switchOff}</ConfirmButton
								>
							{/if}
						</form>
					</div>
				{/if}
			</li>
		{/each}
	</ul>
</div>

<style>
	.form {
		display: grid;
		gap: 1rem;
	}
	.team {
		display: grid;
		gap: 0.75rem;
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.team li {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding: 1rem 1.25rem;
		border-radius: var(--ui-radius);
		background: var(--ui-surface);
		box-shadow: var(--ui-shadow-card);
	}
	.off {
		opacity: 0.7;
	}
	.who {
		display: grid;
		gap: 0.25rem;
		min-inline-size: 14rem;
	}
	.who p {
		margin: 0;
	}
	.name {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.5rem;
		font-weight: 600;
	}
	.muted {
		color: var(--text-secondary);
		font-size: 0.8125rem;
	}
	.buttons {
		display: flex;
		gap: 0.5rem;
	}
</style>
