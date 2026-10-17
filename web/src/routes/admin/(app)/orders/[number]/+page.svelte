<script lang="ts">
	import RowMenu from '#lib/admin/RowMenu.svelte';
	import StepForm from '#lib/admin/StepForm.svelte';
	import { runAction } from '#lib/admin/actions.js';
	import { admin as a, orderAdmin as t, orderCopy as o } from '#lib/copy.js';
	import { formatMoney } from '#lib/money.js';
	import OrderView from '#lib/orders/OrderView.svelte';
	import StatusBadge from '#lib/orders/StatusBadge.svelte';
	import Breadcrumb from '#lib/sinaui/ui/Breadcrumb.svelte';
	import Button from '#lib/sinaui/ui/Button.svelte';
	import RadioCards from '#lib/sinaui/ui/RadioCards.svelte';
	import Textarea from '#lib/sinaui/ui/Textarea.svelte';
	import { toast } from '#lib/sinaui/ui/toast/index.js';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const order = $derived(data.order);
	const forward = $derived(order.next_statuses.filter((s) => s !== 'cancelled'));
	const canCancel = $derived(order.next_statuses.includes('cancelled'));
	const canSend = $derived(
		!order.shipment &&
			data.couriers.length > 0 &&
			(order.status === 'confirmed' || order.status === 'packed')
	);
	let sending = $state(false);

	async function checkParcel() {
		try {
			await runAction('refresh', {});
			toast.success(t.checked);
		} catch (e) {
			toast.error((e as Error).message);
		}
	}

	// Every move asks for an optional note in a dialog, then saves.
	let open = $state(false);
	let to = $state('');
	function move(status: string) {
		to = status;
		open = true;
	}
</script>

<svelte:head><title>{o.number(order.number)} · {data.store.name}</title></svelte:head>

<Breadcrumb
	items={[{ label: t.title, href: '/admin/orders' }, { label: o.number(order.number) }]}
/>
<div class="head">
	<div class="title">
		<h1>{o.number(order.number)}</h1>
		<StatusBadge status={order.status} />
	</div>
	<div class="actions">
		{#if canSend}<Button onclick={() => (sending = true)}>{t.sendWith}</Button>{/if}
		{#each forward as s (s)}<Button
				variant={canSend ? 'secondary' : 'primary'}
				onclick={() => move(s)}>{o.moves[s]}</Button
			>{/each}
		<RowMenu
			label={a.actions(o.number(order.number))}
			actions={[
				{ label: t.call, href: `tel:${order.phone}` },
				...(order.shipment?.consignment_id
					? [{ label: t.checkParcel, onselect: checkParcel }]
					: []),
				...(canCancel
					? [
							{
								label: o.moves.cancelled,
								danger: true,
								separate: true,
								onselect: () => move('cancelled')
							}
						]
					: [])
			]}
		/>
	</div>
</div>
{#if !order.next_statuses.length}<p class="done">{t.done}</p>{/if}

<OrderView {order} />

{#key to}
	<StepForm
		bind:open
		title={o.moves[to] ?? ''}
		action="?/move"
		submitLabel={o.moves[to] ?? ''}
		message={form?.message}
		onsaved={() => toast.success(t.moved(o.statuses[to] ?? ''))}
		steps={[{ label: o.moves[to] ?? '', body: note }]}
	/>
{/key}

{#if canSend}
	<StepForm
		bind:open={sending}
		title={t.sendTitle}
		action="?/book"
		submitLabel={t.sendButton}
		message={form?.message}
		onsaved={() => toast.success(t.sent(form && 'booked' in form ? (form.booked ?? '') : ''))}
		steps={[{ label: t.sendStep, body: courier }]}
	/>
{/if}

{#snippet courier()}
	<RadioCards
		legend={t.chooseCourier}
		name="provider"
		required
		value={data.couriers.length === 1 ? data.couriers[0].code : undefined}
		options={data.couriers.map((c) => ({ value: c.code, label: c.name }))}
	/>
	<p class="muted">{t.collects(formatMoney(order.total))}</p>
{/snippet}

{#snippet note()}
	<input type="hidden" name="from" value={order.status} />
	<input type="hidden" name="to" value={to} />
	<Textarea label={t.note} name="note" placeholder={t.notePlaceholder} maxlength={300} rows={3} />
{/snippet}

<style>
	.head {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		margin-block: 0.75rem 1.25rem;
	}
	.title {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}
	.title h1 {
		margin: 0;
	}
	.actions {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
	.muted {
		margin: 0;
		color: var(--text-secondary);
	}
	.done {
		margin: -0.5rem 0 1rem;
		color: var(--text-secondary);
	}
</style>
