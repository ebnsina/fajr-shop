<script lang="ts">
	import Alert from '#lib/sinaui/ui/Alert.svelte';
	import { orderCopy as t } from '#lib/copy.js';
	import OrderView from '#lib/orders/OrderView.svelte';
	import StatusBadge from '#lib/orders/StatusBadge.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const o = $derived(data.order);
	const day = new Intl.DateTimeFormat('en-BD', { dateStyle: 'long', timeZone: 'Asia/Dhaka' });
</script>

<svelte:head>
	<title>{t.number(o.number)} · {data.store.name}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<section class="site-container page">
	{#if data.placed}
		<Alert tone="success" title={t.thanks} live>
			{t.thanksBody}
			{#if data.guestLink && !data.me}<br />{t.keepLink}{/if}
		</Alert>
	{/if}
	<div class="top">
		<h1 class="site-title">{t.number(o.number)}</h1>
		<StatusBadge status={o.status} />
		<p class="muted">{t.placedOn(day.format(new Date(o.created_at)))}</p>
	</div>
	<OrderView order={o} />
</section>

<style>
	.page {
		display: grid;
		gap: 1.25rem;
		padding-block: 2rem 3rem;
	}
	.top {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.5rem 1rem;
	}
	.top h1 {
		margin: 0;
	}
	.muted {
		margin: 0;
		color: var(--text-secondary);
		font-size: 0.875rem;
	}
	.top .muted {
		flex-basis: 100%;
	}
</style>
