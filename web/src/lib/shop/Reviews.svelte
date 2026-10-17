<script lang="ts">
	import { StarIcon } from '@hugeicons/core-free-icons';
	import Icon from '#lib/sinaui/ui/Icon.svelte';
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import type { components } from '#lib/api.js';
	import { reviewCopy as r } from '#lib/copy.js';
	import Alert from '#lib/sinaui/ui/Alert.svelte';
	import Button from '#lib/sinaui/ui/Button.svelte';
	import ConfirmButton from '#lib/sinaui/ui/ConfirmButton.svelte';
	import Meter from '#lib/sinaui/ui/Meter.svelte';
	import Textarea from '#lib/sinaui/ui/Textarea.svelte';
	import { toast } from '#lib/sinaui/ui/toast/index.js';
	import StarInput from './StarInput.svelte';

	type Review = components['schemas']['Review'];
	let { reviews }: { reviews: components['schemas']['ReviewPage'] } = $props();

	const one = new Intl.NumberFormat('en-BD', {
		minimumFractionDigits: 1,
		maximumFractionDigits: 1
	});
	const day = new Intl.DateTimeFormat('en-BD', { dateStyle: 'medium', timeZone: 'Asia/Dhaka' });
	const form = $derived(
		page.form as { action?: string; fields?: Record<string, string>; message?: string } | null
	);
	const fields = $derived((form?.action === 'review' && form.fields) || {});
	const s = $derived(reviews.summary);
	const mine = $derived(reviews.mine);
	// The caller's own review is shown above, with its buttons; not again in the list.
	const others = $derived(reviews.items.filter((x) => !x.mine));
	let editing = $state(false);
	let removeForm = $state<HTMLFormElement>();
	const next = $derived(encodeURIComponent(`${page.url.pathname}#reviews`));
	const moreHref = $derived(`?reviews=${encodeURIComponent(reviews.next_cursor ?? '')}#reviews`);
</script>

{#snippet stars(n: number, size = 14)}
	<span class="stars" aria-hidden="true">
		{#each [1, 2, 3, 4, 5] as i (i)}<Icon
				icon={StarIcon}
				{size}
				class={i <= Math.round(n) ? 'on' : ''}
			/>{/each}
	</span>
{/snippet}

{#snippet item(x: Review)}
	<article class="review">
		<header>
			{@render stars(x.rating)}
			<span class="sr">{r.starsLabel(x.rating)}</span>
			<strong>{x.author}</strong>
			<time datetime={x.created_at}>{day.format(new Date(x.created_at))}</time>
			{#if x.updated_at !== x.created_at}<span class="muted">· {r.edited}</span>{/if}
		</header>
		{#if x.body}<p>{x.body}</p>{/if}
	</article>
{/snippet}

<div class="reviews">
	<div class="summary">
		{#if s.count && s.average}
			<p class="avg">{one.format(s.average)}</p>
			{@render stars(s.average, 18)}
			<p class="muted">{r.outOf(one.format(s.average))} · {r.count(s.count)}</p>
			<div class="bars">
				{#each [5, 4, 3, 2, 1] as n (n)}
					<Meter
						label={r.starsLabel(n)}
						value={s.stars[n - 1]}
						max={Math.max(1, s.count)}
						showValue
						format={(v) => String(v)}
					/>
				{/each}
			</div>
		{:else}
			<p class="muted">{r.none}</p>
		{/if}
	</div>

	<div class="side">
		{#if !page.data.me}
			<Button variant="secondary" href="/account/login?next={next}">{r.signIn}</Button>
		{:else if mine && !editing}
			<div class="mine">
				<p class="label">{r.yours}</p>
				{#if mine.hidden}<Alert tone="warning" title={r.hidden} />{/if}
				{@render item(mine)}
				<div class="buttons">
					<Button variant="secondary" size="sm" onclick={() => (editing = true)}>{r.edit}</Button>
					<form
						method="POST"
						action="?/unreview"
						bind:this={removeForm}
						use:enhance={() =>
							async ({ result, update }) => {
								await update();
								if (result.type === 'success') toast.success(r.deleted);
							}}
					>
						<ConfirmButton
							size="sm"
							confirm={r.deleteConfirm}
							onconfirm={() => removeForm?.requestSubmit()}>{r.delete}</ConfirmButton
						>
					</form>
				</div>
			</div>
		{:else}
			<form
				method="POST"
				action="?/review"
				class="write"
				use:enhance={() =>
					async ({ result, update }) => {
						await update({ reset: false });
						if (result.type === 'success') {
							editing = false;
							toast.success(r.saved);
						}
					}}
			>
				<p class="label">{mine ? r.edit : r.write}</p>
				{#if form?.action === 'review' && form.message}<Alert
						tone="danger"
						title={form.message}
						live
					/>{/if}
				<StarInput name="rating" value={mine?.rating ?? 0} error={fields.rating} />
				<Textarea
					label={r.body}
					name="body"
					value={mine?.body ?? ''}
					placeholder={r.bodyPlaceholder}
					maxlength={2000}
					error={fields.body}
				/>
				<div class="buttons">
					<Button type="submit">{mine ? r.update : r.save}</Button>
					{#if editing}<Button variant="ghost" onclick={() => (editing = false)}>{r.cancel}</Button
						>{/if}
				</div>
			</form>
		{/if}
	</div>

	{#if others.length}
		<ul class="list">
			{#each others as x (x.id)}<li>{@render item(x)}</li>{/each}
		</ul>
		{#if reviews.next_cursor}<div>
				<Button variant="secondary" href={moreHref}>{r.more}</Button>
			</div>{/if}
	{/if}
</div>

<style>
	.reviews {
		display: grid;
		grid-template-columns: minmax(0, 18rem) minmax(0, 1fr);
		gap: 1.5rem 3rem;
		padding-block: 1.25rem 0;
	}
	.summary {
		display: grid;
		align-content: start;
		gap: 0.375rem;
	}
	.avg {
		margin: 0;
		font-size: 2.5rem;
		font-weight: 700;
		line-height: 1;
	}
	.bars {
		display: grid;
		gap: 0.375rem;
		margin-block-start: 0.75rem;
	}
	.side {
		display: grid;
		align-content: start;
	}
	.mine,
	.write {
		display: grid;
		gap: 0.75rem;
		padding: 1rem;
		border: 1px solid var(--border);
		border-radius: var(--ui-radius);
		background: var(--bg-surface);
	}
	.label {
		margin: 0;
		font-weight: 600;
	}
	.buttons {
		display: flex;
		gap: 0.5rem;
	}
	.list {
		grid-column: 1 / -1;
		display: grid;
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.list li {
		padding-block: 1rem;
		border-block-start: 1px solid var(--border);
	}
	.review {
		display: grid;
		gap: 0.375rem;
	}
	.review header {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.25rem 0.625rem;
		font-size: 0.875rem;
	}
	.review p {
		margin: 0;
		line-height: 1.6;
		white-space: pre-line;
	}
	time,
	.muted {
		margin: 0;
		color: var(--text-secondary);
		font-size: 0.875rem;
	}
	.stars {
		display: inline-flex;
		gap: 0.0625rem;
		color: var(--border-strong);
	}
	.stars :global(svg) {
		fill: currentColor;
	}
	.stars :global(svg.on) {
		color: var(--star);
	}
	.sr {
		position: absolute;
		inline-size: 1px;
		block-size: 1px;
		overflow: hidden;
		clip-path: inset(50%);
	}
	@media (width < 48rem) {
		.reviews {
			grid-template-columns: minmax(0, 1fr);
		}
	}
</style>
