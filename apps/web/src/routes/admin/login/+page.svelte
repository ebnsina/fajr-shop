<script lang="ts">
	import { enhance } from '$app/forms';

	let { form } = $props();
	let submitting = $state(false);
</script>

<svelte:head>
	<title>Sign in · Fajr Shop</title>
	{@html `<script>try{var m=localStorage.getItem('admin-theme');if(m)document.documentElement.setAttribute('data-theme',m)}catch(e){}</script>`}
</svelte:head>

<main class="grid min-h-dvh place-items-center bg-sunken p-6 font-sans text-body antialiased">
	<div class="w-full max-w-sm">
		<div class="mb-8 flex items-center gap-2.5">
			<span class="grid size-9 place-items-center rounded-xl bg-primary-600 font-semibold text-white">F</span>
			<div>
				<h1 class="font-semibold tracking-tight text-strong">Fajr Shop</h1>
				<p class="text-sm text-muted">Sign in to the admin.</p>
			</div>
		</div>

		<form
			method="POST"
			class="card space-y-4"
			use:enhance={() => {
				submitting = true;
				return async ({ update }) => {
					await update();
					submitting = false;
				};
			}}
		>
			{#if form?.error}
				<p class="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300" role="alert">
					{form.error}
				</p>
			{/if}

			<div>
				<label class="label" for="email">Email</label>
				<input id="email" name="email" type="email" required autocomplete="username" value={form?.email ?? ''} class="field" />
			</div>

			<div>
				<label class="label" for="password">Password</label>
				<input id="password" name="password" type="password" required autocomplete="current-password" class="field" />
			</div>

			<button type="submit" disabled={submitting} class="btn btn-primary w-full">
				{submitting ? 'Signing in…' : 'Sign in'}
			</button>
		</form>
	</div>
</main>
