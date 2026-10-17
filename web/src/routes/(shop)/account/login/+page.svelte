<script lang="ts">
	import { enhance } from '$app/forms';
	import { account as t } from '#lib/copy.js';
	import AuthCard from '#lib/sinaui/blocks/auth/AuthCard.svelte';
	import Alert from '#lib/sinaui/ui/Alert.svelte';
	import Button from '#lib/sinaui/ui/Button.svelte';
	import Input from '#lib/sinaui/ui/Input.svelte';
	import PasswordInput from '#lib/sinaui/ui/PasswordInput.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	let busy = $state(false);
</script>

<svelte:head>
	<title>{t.signInTitle} · {data.store.name}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="site-container page">
	<AuthCard title={t.signInTitle} description={t.signInLede} {busy}>
		<form
			method="POST"
			class="fields"
			use:enhance={() => {
				busy = true;
				return async ({ update }) => {
					await update();
					busy = false;
				};
			}}
		>
			{#if form?.message}<Alert tone="danger" title={form.message} live />{/if}
			<Input
				label={t.login}
				name="login"
				autocomplete="username"
				value={form?.login ?? ''}
				required
			/>
			<PasswordInput label={t.password} name="password" autocomplete="current-password" required />
			<Button type="submit" loading={busy}>{t.signIn}</Button>
		</form>
		{#snippet footer()}{t.noAccount} <a href="/account/register">{t.createOne}</a>{/snippet}
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
