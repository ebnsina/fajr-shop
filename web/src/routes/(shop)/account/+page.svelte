<script lang="ts">
	import LogOut from '@lucide/svelte/icons/log-out';
	import Package from '@lucide/svelte/icons/package';
	import { account as t } from '#lib/copy.js';
	import Button from '#lib/sinaui/ui/Button.svelte';
	import EmptyState from '#lib/sinaui/ui/EmptyState.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head>
	<title>{t.yourAccount} · {data.store.name}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="site-container page">
	<div class="head">
		<h1 class="site-title">{t.hello(data.me.name)}</h1>
		<form method="POST" action="?/signout">
			<Button type="submit" variant="secondary"><LogOut size={16} /> {t.signOut}</Button>
		</form>
	</div>
	<div class="grid">
		<section class="card" aria-labelledby="details">
			<h2 id="details">{t.details}</h2>
			<dl>
				<dt>{t.name}</dt>
				<dd>{data.me.name}</dd>
				{#if data.me.phone}<dt>{t.phone}</dt>
					<dd>{data.me.phone}</dd>{/if}
				{#if data.me.email}<dt>Email</dt>
					<dd>{data.me.email}</dd>{/if}
			</dl>
		</section>
		<section class="card">
			<EmptyState title={t.ordersSoon}>
				{#snippet actions()}<Button href="/shop"><Package size={16} /> {t.shopNow}</Button
					>{/snippet}
			</EmptyState>
		</section>
	</div>
</div>

<style>
	.page {
		display: grid;
		gap: 1.5rem;
		padding-block: 2rem;
	}
	.head {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
	}
	.grid {
		display: grid;
		grid-template-columns: minmax(0, 1fr) minmax(0, 2fr);
		gap: 1rem;
	}
	.card {
		padding: 1.25rem;
		border-radius: var(--ui-radius);
		background: var(--ui-surface);
	}
	h2 {
		margin: 0 0 0.75rem;
		font-size: 1rem;
	}
	dl {
		display: grid;
		gap: 0.25rem;
		margin: 0;
	}
	dt {
		color: var(--ui-muted);
		font-size: 0.8125rem;
	}
	dd {
		margin: 0 0 0.5rem;
	}
	@media (width < 48rem) {
		.grid {
			grid-template-columns: minmax(0, 1fr);
		}
	}
</style>
