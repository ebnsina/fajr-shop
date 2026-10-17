<script lang="ts">
	import { CheckmarkCircle02Icon } from '@hugeicons/core-free-icons';
	import Icon from '#lib/sinaui/ui/Icon.svelte';
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
		<div class="thanks" role="status">
			<Icon icon={CheckmarkCircle02Icon} size={28} aria-hidden="true" />
			<div>
				<p class="big">{t.thanks}</p>
				<p>{t.thanksBody}</p>
				{#if data.guestLink && !data.me}<p class="muted">{t.keepLink}</p>{/if}
			</div>
		</div>
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
	.thanks {
		display: flex;
		gap: 1rem;
		padding: 1.25rem;
		border: 1px solid var(--success-700);
		border-radius: calc(var(--ui-radius) * 1.5);
		background: var(--success-bg);
		color: var(--success-text);
	}
	.thanks p {
		margin: 0;
	}
	.big {
		font-size: 1.125rem;
		font-weight: 700;
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
