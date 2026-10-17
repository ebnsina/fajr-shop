<script lang="ts">
	import { enhance } from '$app/forms';
	import { errorText, reviewAdmin as t, reviewCopy as r } from '#lib/copy.js';
	import Badge from '#lib/sinaui/ui/Badge.svelte';
	import Button from '#lib/sinaui/ui/Button.svelte';
	import EmptyState from '#lib/sinaui/ui/EmptyState.svelte';
	import { toast } from '#lib/sinaui/ui/toast/index.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const day = new Intl.DateTimeFormat('en-BD', { dateStyle: 'medium', timeZone: 'Asia/Dhaka' });
</script>

<svelte:head><title>{t.title} · {data.store.name}</title></svelte:head>

<div class="head">
	<h1>{t.title}</h1>
	<p>{t.description}</p>
</div>

{#if data.reviews.length}
	<ul class="items">
		{#each data.reviews as x (x.id)}
			<li class={[x.hidden && 'off']}>
				<div class="info">
					<p class="top">
						<span class="stars" aria-label={r.starsLabel(x.rating)}
							>{'★'.repeat(x.rating)}<span class="dim">{'★'.repeat(5 - x.rating)}</span></span
						>
						{#if x.product}<a href="/p/{x.product.slug}" target="_blank">{x.product.name}</a>{/if}
						{#if x.hidden}<Badge tone="warning">{t.hidden}</Badge>{/if}
					</p>
					<p class={[!x.body && 'muted']}>{x.body || t.noText}</p>
					<p class="muted">{x.author} · {day.format(new Date(x.created_at))}</p>
				</div>
				<form
					method="POST"
					action="?/moderate"
					use:enhance={() =>
						async ({ result, update }) => {
							await update();
							if (result.type === 'failure')
								toast.error(String(result.data?.message ?? errorText('internal')));
							else if (result.type === 'success')
								toast.success(result.data?.hidden ? t.hiddenToast : t.shownToast);
						}}
				>
					<input type="hidden" name="id" value={x.id} />
					<input type="hidden" name="hidden" value={x.hidden ? '0' : '1'} />
					<Button type="submit" variant="secondary" size="sm">{x.hidden ? t.show : t.hide}</Button>
				</form>
			</li>
		{/each}
	</ul>
{:else}
	<EmptyState title={t.emptyTitle}>{t.emptyBody}</EmptyState>
{/if}

<style>
	.items {
		display: grid;
		gap: 0.75rem;
		margin: 0;
		padding: 0;
		list-style: none;
	}
	li {
		display: flex;
		flex-wrap: wrap;
		align-items: start;
		justify-content: space-between;
		gap: 1rem;
		padding: 1rem 1.25rem;
		border-radius: var(--ui-radius);
		background: var(--ui-surface);
		box-shadow: var(--ui-shadow-card);
	}
	.off {
		opacity: 0.7;
	}
	.info {
		display: grid;
		flex: 1;
		gap: 0.375rem;
		min-inline-size: 16rem;
	}
	.info p {
		margin: 0;
		line-height: 1.5;
	}
	.top {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.625rem;
		font-weight: 600;
	}
	.top a {
		color: var(--brand-700);
	}
	.stars {
		color: var(--star);
		letter-spacing: 0.05em;
	}
	.dim {
		color: var(--border-strong);
	}
	.muted {
		color: var(--text-secondary);
		font-size: 0.8125rem;
	}
</style>
