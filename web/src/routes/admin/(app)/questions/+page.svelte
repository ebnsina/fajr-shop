<script lang="ts">
	import { enhance } from '$app/forms';
	import { errorText, questionAdmin as t } from '#lib/copy.js';
	import Badge from '#lib/sinaui/ui/Badge.svelte';
	import Button from '#lib/sinaui/ui/Button.svelte';
	import EmptyState from '#lib/sinaui/ui/EmptyState.svelte';
	import Textarea from '#lib/sinaui/ui/Textarea.svelte';
	import { toast } from '#lib/sinaui/ui/toast/index.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const day = new Intl.DateTimeFormat('en-BD', { dateStyle: 'medium', timeZone: 'Asia/Dhaka' });
	const done =
		() =>
		async ({
			result,
			update
		}: {
			result: { type: string; data?: Record<string, unknown> };
			update: (o?: { reset?: boolean }) => Promise<void>;
		}) => {
			await update({ reset: false });
			if (result.type === 'failure')
				toast.error(String(result.data?.message ?? errorText('internal')));
			else if (result.type === 'success') toast.success(t.saved);
		};
</script>

<svelte:head><title>{t.title} · {data.store.name}</title></svelte:head>

<div class="head">
	<h1>{t.title}</h1>
	<p>{t.description}</p>
</div>

<nav class="filter" aria-label={t.title}>
	<Button
		variant={data.all ? 'ghost' : 'secondary'}
		size="sm"
		href="?"
		aria-current={!data.all ? 'page' : undefined}>{t.waiting}</Button
	>
	<Button
		variant={data.all ? 'secondary' : 'ghost'}
		size="sm"
		href="?all=1"
		aria-current={data.all ? 'page' : undefined}>{t.all}</Button
	>
</nav>

{#if data.questions.length}
	<ul class="items">
		{#each data.questions as x (x.id)}
			<li class={[x.hidden && 'off']}>
				<p class="top">
					{#if x.product}<a href="/p/{x.product.slug}#questions" target="_blank">{x.product.name}</a
						>{/if}
					{#if x.hidden}<Badge tone="warning">{t.hidden}</Badge>
					{:else if x.answer}<Badge tone="accent">{t.answered}</Badge>{/if}
				</p>
				<p class="q">{x.body}</p>
				<p class="muted">{x.author} · {day.format(new Date(x.created_at))}</p>
				<form method="POST" action="?/save" class="answer" use:enhance={done}>
					<input type="hidden" name="id" value={x.id} />
					<input type="hidden" name="current" value={x.hidden ? '1' : '0'} />
					<Textarea
						label={t.answer}
						name="answer"
						value={x.answer ?? ''}
						placeholder={t.answerPlaceholder}
						maxlength={2000}
					/>
					<div class="buttons">
						<Button type="submit">{x.answer ? t.update : t.post}</Button>
						<Button type="submit" variant="ghost" name="hidden" value={x.hidden ? '0' : '1'}
							>{x.hidden ? t.show : t.hide}</Button
						>
					</div>
				</form>
			</li>
		{/each}
	</ul>
{:else}
	<EmptyState title={data.all ? t.emptyAll : t.emptyWaiting}>{t.emptyBody}</EmptyState>
{/if}

<style>
	.filter {
		display: flex;
		gap: 0.375rem;
		margin-block-end: 1rem;
	}
	.items {
		display: grid;
		gap: 0.75rem;
		margin: 0;
		padding: 0;
		list-style: none;
	}
	li {
		display: grid;
		gap: 0.375rem;
		padding: 1rem 1.25rem;
		border-radius: var(--ui-radius);
		background: var(--ui-surface);
		box-shadow: var(--ui-shadow-card);
	}
	.off {
		opacity: 0.7;
	}
	li p {
		margin: 0;
	}
	.top {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.625rem;
		font-size: 0.875rem;
	}
	.top a {
		color: var(--brand-700);
		font-weight: 600;
	}
	.q {
		font-weight: 600;
		line-height: 1.5;
	}
	.muted {
		color: var(--text-secondary);
		font-size: 0.8125rem;
	}
	.answer {
		display: grid;
		gap: 0.5rem;
		margin-block-start: 0.5rem;
	}
	.buttons {
		display: flex;
		gap: 0.5rem;
	}
</style>
