<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import type { components } from '#lib/api.js';
	import { questionCopy as q } from '#lib/copy.js';
	import Alert from '#lib/sinaui/ui/Alert.svelte';
	import Badge from '#lib/sinaui/ui/Badge.svelte';
	import Button from '#lib/sinaui/ui/Button.svelte';
	import Card from '#lib/sinaui/ui/Card.svelte';
	import Textarea from '#lib/sinaui/ui/Textarea.svelte';
	import { toast } from '#lib/sinaui/ui/toast/index.js';

	let { questions }: { questions: components['schemas']['Question'][] } = $props();

	const day = new Intl.DateTimeFormat('en-BD', { dateStyle: 'medium', timeZone: 'Asia/Dhaka' });
	const form = $derived(
		page.form as { action?: string; fields?: Record<string, string>; message?: string } | null
	);
	const next = $derived(encodeURIComponent(`${page.url.pathname}#questions`));
</script>

<div class="questions">
	{#if page.data.me}
		<Card title={q.ask} level={3}>
			<form
				method="POST"
				action="?/ask"
				class="stack"
				use:enhance={() =>
					async ({ result, update }) => {
						await update();
						if (result.type === 'success') toast.success(q.sent);
					}}
			>
				{#if form?.action === 'ask' && form.message}<Alert
						tone="danger"
						title={form.message}
						live
					/>{/if}
				<Textarea
					label={q.label}
					name="body"
					placeholder={q.placeholder}
					maxlength={500}
					required
					error={form?.action === 'ask' ? form.fields?.body : undefined}
				/>
				<div><Button type="submit">{q.send}</Button></div>
			</form>
		</Card>
	{:else}
		<div><Button variant="secondary" href="/account/login?next={next}">{q.signIn}</Button></div>
	{/if}

	{#if questions.length}
		<ul>
			{#each questions as x (x.id)}
				<li>
					<p class="q"><span class="mark" aria-hidden="true">Q</span> {x.body}</p>
					<p class="meta">{q.asked(x.author, day.format(new Date(x.created_at)))}</p>
					{#if x.answer}
						<div class="answer"><Alert tone="info" title={q.answer}>{x.answer}</Alert></div>
					{:else}
						<Badge tone="warning">{q.waiting}</Badge>
					{/if}
				</li>
			{/each}
		</ul>
	{:else}
		<p class="meta">{q.none}</p>
	{/if}
</div>

<style>
	.questions {
		display: grid;
		gap: 1.25rem;
		max-inline-size: 48rem;
		padding-block: 1.25rem 0;
	}
	.stack {
		display: grid;
		gap: 0.75rem;
	}
	ul {
		display: grid;
		margin: 0;
		padding: 0;
		list-style: none;
	}
	li {
		display: grid;
		justify-items: start;
		gap: 0.375rem;
		padding-block: 1rem;
		border-block-start: 1px solid var(--border);
	}
	p {
		margin: 0;
	}
	.q {
		display: flex;
		gap: 0.5rem;
		font-weight: 600;
	}
	.mark {
		color: var(--brand-700);
	}
	.meta {
		color: var(--text-secondary);
		font-size: 0.8125rem;
	}
	.answer {
		justify-self: stretch;
	}
</style>
