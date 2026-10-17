<script lang="ts">
	import { admin as a, customerAdmin as t } from '#lib/copy.js';
	import { formatMoney } from '#lib/money.js';
	import Badge from '#lib/sinaui/ui/Badge.svelte';
	import Button from '#lib/sinaui/ui/Button.svelte';
	import Card from '#lib/sinaui/ui/Card.svelte';
	import Table from '#lib/sinaui/ui/Table.svelte';
	import RowMenu from '#lib/admin/RowMenu.svelte';
	import EmptyState from '#lib/sinaui/ui/EmptyState.svelte';
	import SearchField from '#lib/sinaui/ui/SearchField.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const day = new Intl.DateTimeFormat('en-BD', { dateStyle: 'medium', timeZone: 'Asia/Dhaka' });
	const n = new Intl.NumberFormat('en-BD');
	const phone = (p?: string | null) => p?.replace(/^\+88/, '') ?? '';
</script>

<svelte:head><title>{t.title} · {data.store.name}</title></svelte:head>

<div class="head">
	<h1>{t.title}</h1>
	<p>{t.description}</p>
</div>

<form method="get" role="search" class="search">
	<SearchField
		label={t.search}
		hideLabel
		name="q"
		value={data.q}
		placeholder={t.searchPlaceholder}
	/>
	<Button type="submit" variant="secondary">{t.searchButton}</Button>
</form>

{#if data.customers.length}
	<Card>
		<Table caption={t.title} hideCaption>
			<thead>
				<tr>
					<th scope="col">{t.name}</th>
					<th scope="col" class="num">{t.orders}</th>
					<th scope="col" class="num">{t.spent}</th>
					<th scope="col">{t.lastOrder}</th>
					<th scope="col">{t.joined}</th>
					<th scope="col"><span class="sr">{a.actions('')}</span></th>
				</tr>
			</thead>
			<tbody>
				{#each data.customers as c (c.id)}
					<tr>
						<td>
							<a href="/admin/customers/{c.id}">{c.name}</a>
							{#if c.disabled}<Badge tone="warning">{t.disabled}</Badge>{/if}
							<span class="muted">{[phone(c.phone), c.email].filter(Boolean).join(' · ')}</span>
						</td>
						<td class="num">{n.format(c.order_count)}</td>
						<td class="num">{formatMoney(c.spent)}</td>
						<td class="muted">
							{c.last_order_at ? day.format(new Date(c.last_order_at)) : t.never}
						</td>
						<td class="muted">{day.format(new Date(c.created_at))}</td>
						<td class="menu">
							<RowMenu
								label={a.actions(c.name)}
								actions={[
									{ label: t.view, href: `/admin/customers/${c.id}` },
									...(c.phone ? [{ label: t.call, href: `tel:${c.phone}` }] : []),
									...(c.email ? [{ label: t.email, href: `mailto:${c.email}` }] : [])
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
				href="?{data.q ? `q=${encodeURIComponent(data.q)}&` : ''}cursor={encodeURIComponent(
					data.next
				)}">{t.more}</Button
			>
		</div>
	{/if}
{:else}
	<EmptyState title={data.q ? t.noMatch(data.q) : t.emptyTitle}
		>{data.q ? '' : t.emptyBody}</EmptyState
	>
{/if}

<style>
	.search {
		display: flex;
		gap: 0.5rem;
		max-inline-size: 30rem;
		margin-block-end: 1rem;
	}
	.search > :global(:first-child) {
		flex: 1;
	}
	td a {
		color: var(--brand-700);
		font-weight: 600;
	}
	.muted {
		color: var(--text-secondary);
	}
	span.muted {
		display: block;
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
