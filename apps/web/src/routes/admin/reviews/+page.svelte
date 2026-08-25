<script lang="ts">
	import { page } from '$app/state';
	import { enhance } from '$app/forms';
	import Stars from '$lib/components/Stars.svelte';
	import Badge from '$lib/components/Badge.svelte';

	let { data, form } = $props();

	const when = (d: Date | string) =>
		new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Dhaka' })
			.format(new Date(d));

	const total = $derived(data.reviews.length + data.questions.length);
</script>

<svelte:head><title>Reviews · {page.data.storeName ?? 'Fajr Shop'}</title></svelte:head>

<div class="flex items-baseline justify-between gap-4">
	<div>
		<h1 class="text-xl font-semibold tracking-tight">Reviews and questions</h1>
		<p class="mt-1 text-sm text-muted">
			Nothing a customer writes appears on the shop until you publish it here.
		</p>
	</div>
	{#if total}<Badge tone="warning">{total} waiting</Badge>{/if}
</div>

{#if form?.error}
	<p class="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300" role="alert">
		{form.error}
	</p>
{/if}

<h2 class="mt-8 text-sm font-medium uppercase tracking-wide text-faint">Reviews</h2>

{#if data.reviews.length === 0}
	<p class="mt-3 rounded-3xl border border-dashed border-line/60 p-8 text-center text-sm text-muted">
		No reviews waiting.
	</p>
{:else}
	<ul class="mt-3 space-y-3">
		{#each data.reviews as review (review.id)}
			<li class="rounded-3xl bg-raised p-5 elevated">
				<div class="flex flex-wrap items-center gap-3">
					<Stars rating={review.rating} />
					<strong class="text-sm">{review.authorName}</strong>
					{#if review.isVerified === 'yes'}
						<Badge tone="success">Verified purchase</Badge>
					{/if}
					{#if review.product}
						<a href="/products/{review.product.slug}" class="text-sm text-muted hover:text-primary-600">
							{review.product.title}
						</a>
					{/if}
					<span class="ms-auto text-xs text-faint">{when(review.createdAt)}</span>
				</div>

				{#if review.title}<p class="mt-3 font-medium">{review.title}</p>{/if}
				<p class="mt-1 text-sm text-body">{review.body}</p>

				<div class="mt-4 flex flex-wrap items-end gap-2">
					<form method="POST" action="?/publish" use:enhance>
						<input type="hidden" name="id" value={review.id} />
						<button class="btn btn-primary">Publish</button>
					</form>

					<form method="POST" action="?/reject" use:enhance>
						<input type="hidden" name="id" value={review.id} />
						<button class="btn btn-secondary">Reject</button>
					</form>

					<!-- Replying publishes too: a shop that answers a two-star review
					     in public earns more than one that hides it. -->
					<form method="POST" action="?/reply" use:enhance class="flex flex-1 gap-2">
						<input type="hidden" name="id" value={review.id} />
						<label class="sr-only" for="reply-{review.id}">Reply to {review.authorName}</label>
						<input
							id="reply-{review.id}"
							name="reply"
							placeholder="Reply publicly and publish…"
							class="field min-w-48 flex-1"
						/>
						<button class="btn btn-secondary">Reply</button>
					</form>
				</div>
			</li>
		{/each}
	</ul>
{/if}

<h2 class="mt-10 text-sm font-medium uppercase tracking-wide text-faint">Questions</h2>

{#if data.questions.length === 0}
	<p class="mt-3 rounded-3xl border border-dashed border-line/60 p-8 text-center text-sm text-muted">
		No questions waiting.
	</p>
{:else}
	<ul class="mt-3 space-y-3">
		{#each data.questions as item (item.id)}
			<li class="rounded-3xl bg-raised p-5 elevated">
				<div class="flex flex-wrap items-center gap-3 text-sm">
					<strong>{item.askedName}</strong>
					<span class="text-muted">{item.askedPhone}</span>
					{#if item.product}
						<a href="/products/{item.product.slug}" class="text-muted hover:text-primary-600">
							{item.product.title}
						</a>
					{/if}
					<span class="ms-auto text-xs text-faint">{when(item.createdAt)}</span>
				</div>

				<p class="mt-3 text-body">{item.body}</p>

				<div class="mt-4 flex flex-wrap items-end gap-2">
					<form method="POST" action="?/answer" use:enhance class="flex flex-1 gap-2">
						<input type="hidden" name="id" value={item.id} />
						<label class="sr-only" for="answer-{item.id}">Answer {item.askedName}</label>
						<input
							id="answer-{item.id}"
							name="answer"
							placeholder="Answering publishes the question and your answer…"
							class="field min-w-48 flex-1"
						/>
						<button class="btn btn-primary">Answer</button>
					</form>

					<form method="POST" action="?/dismiss" use:enhance>
						<input type="hidden" name="id" value={item.id} />
						<button class="btn btn-secondary">Dismiss</button>
					</form>
				</div>
			</li>
		{/each}
	</ul>
{/if}
