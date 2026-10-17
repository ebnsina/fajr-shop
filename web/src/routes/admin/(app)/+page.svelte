<script lang="ts">
	import {
		CubeIcon,
		FolderTreeIcon,
		PackageRemoveIcon,
		PencilEdit02Icon
	} from '@hugeicons/core-free-icons';
	import Icon from '#lib/sinaui/ui/Icon.svelte';
	import { activity, overview as t } from '#lib/copy.js';
	import Button from '#lib/sinaui/ui/Button.svelte';
	import EmptyState from '#lib/sinaui/ui/EmptyState.svelte';
	import Table from '#lib/sinaui/ui/Table.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const o = $derived(data.overview);
	const n = new Intl.NumberFormat('en-US');
	const when = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' });
	const stats = $derived([
		{
			label: t.forSale,
			value: o.products.active,
			icon: CubeIcon,
			href: '/admin/products?status=active'
		},
		{
			label: t.drafts,
			value: o.products.draft,
			icon: PencilEdit02Icon,
			href: '/admin/products?status=draft'
		},
		{
			label: t.soldOut,
			value: o.out_of_stock,
			icon: PackageRemoveIcon,
			href: '/admin/products',
			warn: o.out_of_stock > 0
		},
		{ label: t.categories, value: o.categories, icon: FolderTreeIcon, href: '/admin/categories' }
	]);
</script>

<svelte:head><title>{t.title} · {data.store.name}</title></svelte:head>

<div class="head">
	<div>
		<h1>{t.title}</h1>
		<p>{t.description}</p>
	</div>
	<div class="actions">
		<Button variant="secondary" href="/admin/banners">{t.addBanner}</Button>
		<Button href="/admin/products/new">{t.addProduct}</Button>
	</div>
</div>

<ul class="stats">
	{#each stats as s (s.label)}
		<li class={[s.warn && 'warn']}>
			<svelte:element this={s.href ? 'a' : 'div'} href={s.href} class="stat">
				<span class="icon"><Icon icon={s.icon} size={20} /></span>
				<span class="value">{n.format(s.value)}</span>
				<span class="label">{s.label}</span>
			</svelte:element>
		</li>
	{/each}
</ul>

<div class="grid">
	<section class="panel" aria-labelledby="low">
		<h2 id="low">{t.lowStock}</h2>
		{#if o.low_stock.length}
			<Table caption={t.lowStock} hideCaption>
				<thead><tr><th>{t.product}</th><th class="num">{t.left}</th></tr></thead>
				<tbody>
					{#each o.low_stock as l (l.variant_id)}
						<tr>
							<td>
								<a href="/admin/products/{l.product_id}">{l.name}</a>
								{#if Object.keys(l.options).length}<span class="opt"
										>{Object.values(l.options).join(' / ')}</span
									>{/if}
							</td>
							<td class="num">{l.stock}</td>
						</tr>
					{/each}
				</tbody>
			</Table>
		{:else}
			<EmptyState title={t.lowStockNone} />
		{/if}
	</section>

	{#if data.activity}
		<section class="panel" aria-labelledby="recent">
			<div class="panel-head">
				<h2 id="recent">{t.recent}</h2>
				<a href="/admin/activity">{t.allActivity}</a>
			</div>
			{#if data.activity.length}
				<ul class="feed">
					{#each data.activity as e (e.id)}
						<li>
							<span>{activity[e.action] ?? e.action}</span>
							<span class="meta">{e.actor ?? t.system} · {when.format(new Date(e.created_at))}</span
							>
						</li>
					{/each}
				</ul>
			{:else}
				<EmptyState title={t.recentNone} />
			{/if}
		</section>
	{/if}
</div>

<style>
	.actions {
		display: flex;
		gap: 0.5rem;
	}
	.stats {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(11rem, 1fr));
		gap: 1rem;
		margin: 0 0 1.5rem;
		padding: 0;
		list-style: none;
	}
	.stat {
		display: grid;
		grid-template-columns: auto 1fr;
		grid-template-rows: auto auto;
		column-gap: 0.75rem;
		align-items: center;
		block-size: 100%;
		box-sizing: border-box;
		padding: 1rem 1.25rem;
		border-radius: var(--ui-radius);
		background: var(--ui-surface);
		box-shadow: var(--ui-shadow-card);
		color: var(--ui-fg);
		text-decoration: none;
	}
	a.stat:hover {
		outline: 1px solid var(--ui-accent);
	}
	.icon {
		display: grid;
		grid-row: span 2;
		place-items: center;
		inline-size: 2.5rem;
		block-size: 2.5rem;
		border-radius: var(--ui-radius-control);
		background: color-mix(in srgb, var(--ui-accent) 12%, transparent);
		color: var(--ui-accent);
	}
	.warn .icon {
		background: color-mix(in srgb, var(--ui-warning) 14%, transparent);
		color: var(--ui-warning);
	}
	.value {
		font-size: 1.5rem;
		font-weight: 700;
		font-variant-numeric: tabular-nums;
		line-height: 1.1;
	}
	.label {
		color: var(--ui-muted);
		font-size: 0.8125rem;
	}
	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(24rem, 1fr));
		gap: 1.5rem;
		align-items: start;
	}
	.panel {
		padding: 1.25rem;
		border-radius: var(--ui-radius);
		background: var(--ui-surface);
		box-shadow: var(--ui-shadow-card);
	}
	.panel h2 {
		margin: 0 0 0.75rem;
		font-size: 1rem;
	}
	.panel-head {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
	}
	.opt {
		display: block;
		color: var(--ui-muted);
		font-size: 0.8125rem;
	}
	.feed {
		display: grid;
		gap: 0.75rem;
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.feed li {
		display: grid;
		gap: 0.125rem;
	}
	.meta {
		color: var(--ui-muted);
		font-size: 0.8125rem;
	}
</style>
