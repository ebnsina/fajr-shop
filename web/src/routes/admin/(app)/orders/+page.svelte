<script lang="ts">
	import { orderAdmin as t, orderCopy as o } from '#lib/copy.js';
	import { formatMoney } from '#lib/money.js';
	import StatusBadge from '#lib/orders/StatusBadge.svelte';
	import Button from '#lib/sinaui/ui/Button.svelte';
	import EmptyState from '#lib/sinaui/ui/EmptyState.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const when = new Intl.DateTimeFormat('en-BD', {
		dateStyle: 'medium',
		timeStyle: 'short',
		timeZone: 'Asia/Dhaka'
	});
	const phone = (p: string) => p.replace(/^\+88/, '');
</script>

<svelte:head><title>{t.title} · {data.store.name}</title></svelte:head>

<div class="head">
	<h1>{t.title}</h1>
	<p>{t.description}</p>
</div>

<nav class="filter" aria-label={t.status}>
	<Button
		size="sm"
		variant={data.status ? 'ghost' : 'secondary'}
		href="?"
		aria-current={!data.status ? 'page' : undefined}>{t.all}</Button
	>
	{#each data.statuses as s (s)}
		<Button
			size="sm"
			variant={data.status === s ? 'secondary' : 'ghost'}
			href="?status={s}"
			aria-current={data.status === s ? 'page' : undefined}>{o.statuses[s]}</Button
		>
	{/each}
</nav>

{#if data.orders.length}
	<div class="table">
		<table>
			<thead>
				<tr>
					<th scope="col">#</th>
					<th scope="col">{t.customer}</th>
					<th scope="col">{t.placed}</th>
					<th scope="col">{t.items}</th>
					<th scope="col" class="num">{t.total}</th>
					<th scope="col">{t.status}</th>
				</tr>
			</thead>
			<tbody>
				{#each data.orders as x (x.id)}
					<tr>
						<td><a href="/admin/orders/{x.number}">{x.number}</a></td>
						<td>
							<span class="name">{x.customer_name}</span>
							<span class="muted">{phone(x.phone)} · {x.district}</span>
						</td>
						<td class="muted">{when.format(new Date(x.created_at))}</td>
						<td>{x.item_count}</td>
						<td class="num">{formatMoney(x.total)}</td>
						<td><StatusBadge status={x.status} /></td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
	{#if data.next}
		<div class="more">
			<Button
				variant="secondary"
				href="?{data.status ? `status=${data.status}&` : ''}cursor={encodeURIComponent(data.next)}"
				>{t.more}</Button
			>
		</div>
	{/if}
{:else}
	<EmptyState title={t.emptyTitle}>{t.emptyBody}</EmptyState>
{/if}

<style>
	.filter {
		display: flex;
		flex-wrap: wrap;
		gap: 0.375rem;
		margin-block-end: 1rem;
	}
	.table {
		overflow-x: auto;
		border-radius: var(--ui-radius);
		background: var(--ui-surface);
		box-shadow: var(--ui-shadow-card);
	}
	table {
		inline-size: 100%;
		border-collapse: collapse;
		font-size: 0.875rem;
	}
	th,
	td {
		padding: 0.75rem 1rem;
		border-block-end: 1px solid var(--border);
		text-align: start;
		vertical-align: middle;
	}
	th {
		color: var(--text-secondary);
		font-weight: 600;
		white-space: nowrap;
	}
	tr:last-child td {
		border-block-end: 0;
	}
	.num {
		text-align: end;
		font-variant-numeric: tabular-nums;
	}
	td a {
		color: var(--brand-600);
		font-weight: 600;
	}
	.name {
		display: block;
		font-weight: 500;
	}
	.muted {
		color: var(--text-secondary);
	}
	.more {
		display: flex;
		justify-content: center;
		margin-block-start: 1rem;
	}
</style>
