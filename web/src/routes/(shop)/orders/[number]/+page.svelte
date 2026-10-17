<script lang="ts">
	import { enhance } from '$app/forms';
	import Alert from '#lib/sinaui/ui/Alert.svelte';
	import Button from '#lib/sinaui/ui/Button.svelte';
	import { orderCopy as t, payCopy as pc } from '#lib/copy.js';
	import { formatMoney } from '#lib/money.js';
	import OrderView from '#lib/orders/OrderView.svelte';
	import StatusBadge from '#lib/orders/StatusBadge.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const o = $derived(data.order);
	const day = new Intl.DateTimeFormat('en-BD', { dateStyle: 'long', timeZone: 'Asia/Dhaka' });
</script>

<svelte:head>
	<title>{t.number(o.number)} · {data.store.name}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<section class="site-container page">
	{#if data.paid && o.payment_status === 'paid'}
		<Alert tone="success" title={pc.paidTitle} live>{pc.paidBody}</Alert>
	{:else if o.payment_status === 'unpaid' && o.status === 'pending'}
		<Alert
			tone={data.payment ? 'danger' : 'warning'}
			title={data.payment === 'cancelled'
				? pc.cancelledTitle
				: data.payment
					? pc.failedTitle
					: pc.waitingTitle}
			live
		>
			{form?.message ?? pc.waitingBody(formatMoney(o.total))}
			<span class="pay">
				<form method="POST" action="?/pay" use:enhance>
					<Button type="submit">{pc.payNow(formatMoney(o.total))}</Button>
				</form>
				<form method="POST" action="?/cod" use:enhance>
					<Button type="submit" variant="secondary">{pc.payOnDelivery}</Button>
				</form>
			</span>
		</Alert>
	{:else if form && 'switched' in form}
		<Alert tone="success" title={pc.switched} live />
	{/if}
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
	.pay {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		margin-block-start: 0.75rem;
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
