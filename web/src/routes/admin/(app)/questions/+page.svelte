<script lang="ts">
	import type { components } from '#lib/api.js';
	import { runAction } from '#lib/admin/actions.js';
	import RowMenu from '#lib/admin/RowMenu.svelte';
	import StepForm from '#lib/admin/StepForm.svelte';
	import { admin as a, questionAdmin as t } from '#lib/copy.js';
	import Badge from '#lib/sinaui/ui/Badge.svelte';
	import Button from '#lib/sinaui/ui/Button.svelte';
	import Card from '#lib/sinaui/ui/Card.svelte';
	import EmptyState from '#lib/sinaui/ui/EmptyState.svelte';
	import Table from '#lib/sinaui/ui/Table.svelte';
	import Textarea from '#lib/sinaui/ui/Textarea.svelte';
	import { toast } from '#lib/sinaui/ui/toast/index.js';
	import type { PageProps } from './$types';

	type Question = components['schemas']['Question'];
	let { data, form }: PageProps = $props();
	const day = new Intl.DateTimeFormat('en-BD', { dateStyle: 'medium', timeZone: 'Asia/Dhaka' });

	let open = $state(false);
	let answering = $state<Question | null>(null);

	async function setHidden(x: Question, hidden: boolean) {
		try {
			await runAction('save', { id: x.id, answer: x.answer ?? '', hidden: hidden ? '1' : '0' });
			toast.success(t.saved);
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
	<Card>
		<Table caption={t.title} hideCaption>
			<thead>
				<tr>
					<th scope="col">{t.question}</th>
					<th scope="col">{t.product}</th>
					<th scope="col">{t.asked}</th>
					<th scope="col">{t.statusCol}</th>
					<th scope="col"><span class="sr">{a.actions('')}</span></th>
				</tr>
			</thead>
			<tbody>
				{#each data.questions as x (x.id)}
					<tr>
						<td class="q">
							<strong>{x.body}</strong>
							{#if x.answer}<span class="muted">{x.answer}</span>{/if}
						</td>
						<td
							>{#if x.product}<a href="/p/{x.product.slug}#questions" target="_blank"
									>{x.product.name}</a
								>{/if}</td
						>
						<td class="muted-cell">{x.author} · {day.format(new Date(x.created_at))}</td>
						<td>
							{#if x.hidden}<Badge tone="warning">{t.hidden}</Badge>
							{:else if x.answer}<Badge tone="accent">{t.answered}</Badge>
							{:else}<Badge tone="warning" icon={false}>{t.waitingBadge}</Badge>{/if}
						</td>
						<td class="menu">
							<RowMenu
								label={a.actions(x.body)}
								actions={[
									{
										label: x.answer ? t.update : t.post,
										onselect: () => {
											answering = x;
											open = true;
										}
									},
									x.hidden
										? { label: t.show, onselect: () => setHidden(x, false) }
										: { label: t.hide, onselect: () => setHidden(x, true) }
								]}
							/>
						</td>
					</tr>
				{/each}
			</tbody>
		</Table>
	</Card>
{:else}
	<EmptyState title={data.all ? t.emptyAll : t.emptyWaiting}>{t.emptyBody}</EmptyState>
{/if}

{#key answering?.id}
	<StepForm
		bind:open
		title={answering?.body ?? t.answer}
		action="?/save"
		submitLabel={answering?.answer ? t.update : t.post}
		message={form && 'message' in form ? form.message : undefined}
		onsaved={() => toast.success(t.saved)}
		steps={[{ label: t.answer, body: answer }]}
	/>
{/key}

{#snippet answer()}
	{#if answering}
		<input type="hidden" name="id" value={answering.id} />
		<input type="hidden" name="current" value={answering.hidden ? '1' : '0'} />
		<Textarea
			label={t.answer}
			name="answer"
			value={answering.answer ?? ''}
			placeholder={t.answerPlaceholder}
			maxlength={2000}
			required
		/>
	{/if}
{/snippet}

<style>
	.filter {
		display: flex;
		gap: 0.375rem;
		margin-block-end: 1rem;
	}
	a {
		color: var(--brand-700);
		font-weight: 600;
	}
	.q {
		max-inline-size: 30rem;
	}
	.muted {
		display: block;
		color: var(--text-secondary);
		font-size: 0.8125rem;
	}
	.muted-cell {
		color: var(--text-secondary);
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
