<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { signIn as t } from '#lib/copy.js';
	import SignIn from '#lib/sinaui/blocks/auth/SignIn.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	// Only a path on this site, so the link can't send someone elsewhere after signing in.
	const next = $derived.by(() => {
		const n = page.url.searchParams.get('next') ?? '';
		return n.startsWith('/admin') && !n.startsWith('//') ? n : '/admin';
	});

	async function signIn(credentials: { email: string; password: string; remember: boolean }) {
		const res = await fetch('/admin/session', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(credentials)
		});
		if (!res.ok) {
			const { code } = await res.json().catch(() => ({}));
			// The block words the codes it knows; any other shows its general message.
			throw Object.assign(new Error(code), {
				code: code === 'rate_limited' ? 'too_many_attempts' : code
			});
		}
		await goto(next, { invalidateAll: true });
	}
</script>

<svelte:head>
	<title>{t.title} · {data.store.name}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="login">
	<SignIn title={t.title} description={t.description} onsubmit={signIn} />
</div>

<style>
	.login {
		display: grid;
		place-items: center;
		min-block-size: 100dvb;
		padding: 1rem;
		box-sizing: border-box;
		background: var(--ui-surface-sunken, var(--ui-bg));
	}
</style>
