<script lang="ts">
	import { enhance } from '$app/forms';
	import { account as t, ph } from '#lib/copy.js';
	import AuthCard from '#lib/sinaui/blocks/auth/AuthCard.svelte';
	import Alert from '#lib/sinaui/ui/Alert.svelte';
	import Button from '#lib/sinaui/ui/Button.svelte';
	import Input from '#lib/sinaui/ui/Input.svelte';
	import PasswordInput from '#lib/sinaui/ui/PasswordInput.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const fields = $derived<Record<string, string>>(form?.fields ?? {});
	let busy = $state(false);
</script>

<svelte:head>
	<title>{t.registerTitle} · {data.store.name}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="site-container page">
	<AuthCard title={t.registerTitle} description={t.registerLede} {busy}>
		<form
			method="POST"
			class="fields"
			use:enhance={() => {
				busy = true;
				return async ({ update }) => {
					await update({ reset: false });
					busy = false;
				};
			}}
		>
			{#if form?.message}<Alert tone="danger" title={form.message} live />{/if}
			<Input
				label={t.name}
				placeholder={ph.customerName}
				name="name"
				autocomplete="name"
				value={form?.values.name ?? ''}
				required
				maxlength={80}
				error={fields.name}
			/>
			<Input
				label={t.phone}
				placeholder={ph.phone}
				name="phone"
				type="tel"
				inputmode="tel"
				autocomplete="tel"
				value={form?.values.phone ?? ''}
				hint={t.phoneHint}
				error={fields.phone}
			/>
			<Input
				label={t.email}
				placeholder={ph.customerEmail}
				name="email"
				type="email"
				autocomplete="email"
				value={form?.values.email ?? ''}
				error={fields.email}
			/>
			<PasswordInput
				label={t.password}
				placeholder={ph.newPassword}
				name="password"
				autocomplete="new-password"
				hint={t.passwordHint}
				minlength={8}
				required
				error={fields.password}
			/>
			<Button type="submit" loading={busy}>{t.register}</Button>
		</form>
		{#snippet footer()}{t.haveAccount} <a href="/account/login">{t.signInInstead}</a>{/snippet}
	</AuthCard>
</div>

<style>
	.page {
		display: grid;
		place-items: center;
		padding-block: 3rem;
	}
	.fields {
		display: grid;
		gap: 1rem;
	}
</style>
