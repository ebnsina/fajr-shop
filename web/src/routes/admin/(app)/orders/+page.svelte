<script lang="ts">
	import { admin as a, orderAdmin as t, orderCopy as o, orderCopy as oc } from '#lib/copy.js';
	import { formatMoney } from '#lib/money.js';
	import StatusBadge from '#lib/orders/StatusBadge.svelte';
	import Button from '#lib/sinaui/ui/Button.svelte';
	import Card from '#lib/sinaui/ui/Card.svelte';
	import Table from '#lib/sinaui/ui/Table.svelte';
	import RowMenu from '#lib/admin/RowMenu.svelte';
	import EmptyState from '#lib/sinaui/ui/EmptyState.svelte';
	import SearchField from '#lib/sinaui/ui/SearchField.svelte';
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

<div class="tools">
	<form method="get" role="search" class="search">
		<SearchField
			label={t.search}
			hideLabel
			name="q"
			value={data.q}
			placeholder={t.searchPlaceholder}
		/>
		{#if data.status}<input type="hidden" name="status" value={data.status} />{/if}
		<Button type="submit" variant="secondary">{t.searchButton}</Button>
	</form>
	<nav class="filter" aria-label={t.status}>
		<Button
			size="sm"
			variant={data.status ? 'ghost' : 'secondary'}
			href={data.q ? `?q=${encodeURIComponent(data.q)}` : '?'}
			aria-current={!data.status ? 'page' : undefined}>{t.all}</Button
		>
		{#each data.statuses as s (s)}
			<Button
				size="sm"
				variant={data.status === s ? 'secondary' : 'ghost'}
				href="?status={s}{data.q ? `&q=${encodeURIComponent(data.q)}` : ''}"
				aria-current={data.status === s ? 'page' : undefined}>{o.statuses[s]}</Button
			>
		{/each}
	</nav>
</div>

{#if data.orders.length}
	<Card>
		<Table caption={t.title} hideCaption>
			<thead>
				<tr>
					<th scope="col">#</th>
					<th scope="col">{t.customer}</th>
					<th scope="col">{t.placed}</th>
					<th scope="col">{t.items}</th>
					<th scope="col" class="num">{t.total}</th>
					<th scope="col">{t.status}</th>
					<th scope="col"><span class="sr">{a.actions('')}</span></th>
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
						<td class="menu">
							<RowMenu
								label={a.actions(oc.number(x.number))}
								actions={[
									{ label: t.view, href: `/admin/orders/${x.number}` },
									{ label: t.call, href: `tel:${x.phone}` }
								]}
							/>
						</td>
					</tr>
				{/each}
			</tbody>
		</Table>
	</Card>
	{#if data.next}
		<div class="more">
			<Button
				variant="secondary"
				href="?{data.status ? `status=${data.status}&` : ''}{data.q
					? `q=${encodeURIComponent(data.q)}&`
					: ''}cursor={encodeURIComponent(data.next)}">{t.more}</Button
			>
		</div>
	{/if}
{:else}
	<EmptyState title={data.q ? t.noMatch(data.q) : t.emptyTitle}
		>{data.q ? '' : t.emptyBody}</EmptyState
	>
{/if}

<style>
	.tools {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem 1.5rem;
		margin-block-end: 1rem;
	}
	.search {
		display: flex;
		flex: 1 1 22rem;
		gap: 0.5rem;
		max-inline-size: 30rem;
	}
	.search > :global(:first-child) {
		flex: 1;
	}
	.filter {
		display: flex;
		flex-wrap: wrap;
		gap: 0.375rem;
	}
	td a {
		color: var(--brand-700);
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
	.menu {
		inline-size: 1%;
	}
	.sr {
		position: absolute;
		inline-size: 1px;
		block-size: 1px;
		overflow: hidden;
		clip-path: inset(50%);
	}
</style>
