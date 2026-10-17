<script lang="ts">
	import { activityPage as t } from '#lib/copy.js';
	import { describe } from '#lib/admin/activity.js';
	import Button from '#lib/sinaui/ui/Button.svelte';
	import EmptyState from '#lib/sinaui/ui/EmptyState.svelte';
	import Table from '#lib/sinaui/ui/Table.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const when = new Intl.DateTimeFormat('en-BD', {
		dateStyle: 'medium',
		timeStyle: 'short',
		timeZone: 'Asia/Dhaka'
	});
</script>

<svelte:head><title>{t.title} · {data.store.name}</title></svelte:head>

<div class="head">
	<h1>{t.title}</h1>
	<p>{t.description}</p>
</div>

{#if data.page.items.length}
	<Table caption={t.caption} hideCaption>
		<thead>
			<tr><th>{t.columns.when}</th><th>{t.columns.who}</th><th>{t.columns.what}</th></tr>
		</thead>
		<tbody>
			{#each data.page.items as entry (entry.id)}{@const d = describe(entry)}
				<tr>
					<td><time datetime={entry.created_at}>{when.format(new Date(entry.created_at))}</time></td
					>
					<td>{entry.actor ?? t.system}</td>
					<td
						>{#if d.href}<a href={d.href}>{d.text}</a>{:else}{d.text}{/if}</td
					>
				</tr>
			{/each}
		</tbody>
	</Table>
{:else}
	<EmptyState title={t.emptyTitle}>{t.emptyBody}</EmptyState>
{/if}

<nav class="pages" aria-label={t.caption}>
	{#if data.older}<Button href="/admin/activity" variant="ghost">{t.newest}</Button>{/if}
	{#if data.page.next_cursor}
		<Button href="?cursor={encodeURIComponent(data.page.next_cursor)}" variant="secondary"
			>{t.older}</Button
		>
	{/if}
</nav>

<style>
	td a {
		color: var(--brand-700);
	}
	.pages {
		display: flex;
		justify-content: end;
		gap: 0.5rem;
		margin-block-start: 1rem;
	}
</style>
