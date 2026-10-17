<script lang="ts">
	import LogOut from '@lucide/svelte/icons/log-out';
	import Package from '@lucide/svelte/icons/package';
	import { account as t, errorText, orderCopy as o } from '#lib/copy.js';
	import { formatMoney } from '#lib/money.js';
	import StatusBadge from '#lib/orders/StatusBadge.svelte';
	import Button from '#lib/sinaui/ui/Button.svelte';
	import EmptyState from '#lib/sinaui/ui/EmptyState.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const day = new Intl.DateTimeFormat('en-BD', { dateStyle: 'medium', timeZone: 'Asia/Dhaka' });
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
		<section class="card" aria-labelledby="orders">
			<h2 id="orders">{o.myOrders}</h2>
			{#if data.orders === null}
				<p class="muted">{errorText('internal')}</p>
			{:else if data.orders.length}
				<ul class="orders">
					{#each data.orders as x (x.id)}
						<li>
							<a href="/orders/{x.number}">
								<span class="num">{o.number(x.number)}</span>
								<StatusBadge status={x.status} />
								<span class="muted"
									>{day.format(new Date(x.created_at))} · {o.itemCount(x.item_count)}</span
								>
								<strong>{formatMoney(x.total)}</strong>
							</a>
						</li>
					{/each}
				</ul>
			{:else}
				<EmptyState title={o.noOrders}>
					{o.noOrdersBody}
					{#snippet actions()}<Button href="/shop"><Package size={16} /> {t.shopNow}</Button
						>{/snippet}
				</EmptyState>
			{/if}
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
	.orders {
		display: grid;
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.orders a {
		display: grid;
		grid-template-columns: auto auto 1fr auto;
		align-items: center;
		gap: 0.75rem;
		padding-block: 0.75rem;
		border-block-end: 1px solid var(--border);
		color: inherit;
		text-decoration: none;
	}
	.orders a:hover .num {
		color: var(--brand-600);
		text-decoration: underline;
	}
	.num {
		font-weight: 600;
	}
	.muted {
		margin: 0;
		color: var(--text-secondary);
		font-size: 0.875rem;
	}
	.orders strong {
		font-variant-numeric: tabular-nums;
	}
</style>
