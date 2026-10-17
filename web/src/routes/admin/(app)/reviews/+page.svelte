<script lang="ts">
	import { StarIcon } from '@hugeicons/core-free-icons';
	import type { components } from '#lib/api.js';
	import { runAction } from '#lib/admin/actions.js';
	import RowMenu from '#lib/admin/RowMenu.svelte';
	import { admin as a, reviewAdmin as t, reviewCopy as r } from '#lib/copy.js';
	import Avatar from '#lib/sinaui/ui/Avatar.svelte';
	import Badge from '#lib/sinaui/ui/Badge.svelte';
	import Card from '#lib/sinaui/ui/Card.svelte';
	import EmptyState from '#lib/sinaui/ui/EmptyState.svelte';
	import Icon from '#lib/sinaui/ui/Icon.svelte';
	import Table from '#lib/sinaui/ui/Table.svelte';
	import { toast } from '#lib/sinaui/ui/toast/index.js';
	import type { PageProps } from './$types';

	type Review = components['schemas']['Review'];
	let { data }: PageProps = $props();
	const day = new Intl.DateTimeFormat('en-BD', { dateStyle: 'medium', timeZone: 'Asia/Dhaka' });

	async function moderate(x: Review, hidden: boolean) {
		try {
			await runAction('moderate', { id: x.id, hidden: hidden ? '1' : '0' });
			toast.success(hidden ? t.hiddenToast : t.shownToast);
		} catch (e) {
			toast.error((e as Error).message);
		}
	}
</script>

<svelte:head><title>{t.title} · {data.store.name}</title></svelte:head>

<div class="head">
	<h1>{t.title}</h1>
	<p>{t.description}</p>
</div>

{#if data.reviews.length}
	<Card>
		<Table caption={t.title} hideCaption>
			<thead>
				<tr>
					<th scope="col">{t.product}</th>
					<th scope="col">{t.rating}</th>
					<th scope="col">{t.review}</th>
					<th scope="col">{t.by}</th>
					<th scope="col">{t.statusCol}</th>
					<th scope="col"><span class="sr">{a.actions('')}</span></th>
				</tr>
			</thead>
			<tbody>
				{#each data.reviews as x (x.id)}
					<tr>
						<td
							>{#if x.product}<a href="/p/{x.product.slug}" target="_blank">{x.product.name}</a
								>{/if}</td
						>
						<td>
							<span class="stars" aria-label={r.starsLabel(x.rating)}
								>{#each [1, 2, 3, 4, 5] as i (i)}<Icon
										icon={StarIcon}
										size={14}
										fill={i <= x.rating ? 'currentColor' : 'none'}
										class={i > x.rating ? 'dim' : undefined}
									/>{/each}</span
							>
						</td>
						<td class="body">{x.body || t.noText}</td>
						<td>
							<span class="who"
								><Avatar name={x.author} size="sm" decorative /><span
									>{x.author}<span class="muted">{day.format(new Date(x.created_at))}</span></span
								></span
							>
						</td>
						<td>
							{#if x.hidden}<Badge tone="warning">{t.hidden}</Badge>{:else}<Badge icon={false}
									>{t.shown}</Badge
								>{/if}
						</td>
						<td class="menu">
							<RowMenu
								label={a.actions(x.product?.name ?? x.author)}
								actions={[
									x.hidden
										? { label: t.show, onselect: () => moderate(x, false) }
										: { label: t.hide, onselect: () => moderate(x, true) },
									...(x.product ? [{ label: t.viewProduct, href: `/p/${x.product.slug}` }] : [])
								]}
							/>
						</td>
					</tr>
				{/each}
			</tbody>
		</Table>
	</Card>
{:else}
	<EmptyState title={t.emptyTitle}>{t.emptyBody}</EmptyState>
{/if}

<style>
	a {
		color: var(--brand-700);
		font-weight: 600;
	}
	.stars {
		display: inline-flex;
		gap: 0.125rem;
		color: var(--star);
	}
	.stars :global(.dim) {
		color: var(--border-strong);
	}
	.body {
		max-inline-size: 28rem;
	}
	.who {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
	.muted {
		display: block;
		color: var(--text-secondary);
		font-size: 0.8125rem;
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
