<script lang="ts">
	import { enhance } from '$app/forms';
	import { errorText, orderAdmin as t, orderCopy as o } from '#lib/copy.js';
	import OrderView from '#lib/orders/OrderView.svelte';
	import StatusBadge from '#lib/orders/StatusBadge.svelte';
	import Alert from '#lib/sinaui/ui/Alert.svelte';
	import Button from '#lib/sinaui/ui/Button.svelte';
	import ConfirmButton from '#lib/sinaui/ui/ConfirmButton.svelte';
	import Textarea from '#lib/sinaui/ui/Textarea.svelte';
	import { toast } from '#lib/sinaui/ui/toast/index.js';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const order = $derived(data.order);
	const forward = $derived(order.next_statuses.filter((s) => s !== 'cancelled'));
	const canCancel = $derived(order.next_statuses.includes('cancelled'));
	let moveForm = $state<HTMLFormElement>();
	let cancel = $state('');
</script>

<svelte:head><title>{o.number(order.number)} · {data.store.name}</title></svelte:head>

<a class="back" href="/admin/orders">← {t.back}</a>
<div class="head">
	<h1>{o.number(order.number)}</h1>
	<StatusBadge status={order.status} />
</div>

<div class="actions">
	{#if order.next_statuses.length}
		<form
			method="POST"
			action="?/move"
			bind:this={moveForm}
			use:enhance={() =>
				async ({ result, update }) => {
					cancel = '';
					await update();
					if (result.type === 'success')
						toast.success(t.moved(o.statuses[String(result.data?.to)] ?? ''));
				}}
		>
			<input type="hidden" name="from" value={order.status} />
			<input type="hidden" name="cancel" value={cancel} />
			{#if form?.message}<Alert tone="danger" title={form.message} live />{/if}
			<Textarea
				label={t.note}
				name="note"
				placeholder={t.notePlaceholder}
				maxlength={300}
				rows={2}
			/>
			<div class="buttons">
				{#each forward as s (s)}
					<Button type="submit" name="to" value={s}>{o.moves[s]}</Button>
				{/each}
				{#if canCancel}
					<ConfirmButton
						confirm={t.cancelConfirm}
						onconfirm={async () => {
							cancel = 'cancelled';
							await Promise.resolve();
							moveForm?.requestSubmit();
						}}>{o.moves.cancelled}</ConfirmButton
					>
				{/if}
				<Button variant="ghost" href="tel:{order.phone}"
					>{t.call} {order.phone.replace(/^\+88/, '')}</Button
				>
			</div>
		</form>
	{:else}
		<p class="muted">{t.done}</p>
	{/if}
</div>

<OrderView {order} />

<style>
	.back {
		display: inline-block;
		margin-block-end: 0.75rem;
		color: var(--brand-600);
		font-size: 0.875rem;
	}
	.head {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}
	.actions {
		margin-block: 1rem 1.5rem;
		padding: 1rem 1.25rem;
		border-radius: var(--ui-radius);
		background: var(--ui-surface);
		box-shadow: var(--ui-shadow-card);
	}
	form {
		display: grid;
		gap: 0.75rem;
	}
	.buttons {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}
	.muted {
		margin: 0;
		color: var(--text-secondary);
	}
</style>
