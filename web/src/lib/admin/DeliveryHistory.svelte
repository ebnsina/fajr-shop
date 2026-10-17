<script lang="ts">
	import type { components } from '#lib/api.js';
	import { historyCopy as t } from '#lib/copy.js';
	import Alert from '#lib/sinaui/ui/Alert.svelte';
	import Card from '#lib/sinaui/ui/Card.svelte';
	import Skeleton from '#lib/sinaui/ui/Skeleton.svelte';

	// How a customer's past parcels went, before sending cash on delivery. Couriers can take a few
	// seconds to answer, so this shows while the rest of the order is already on screen.
	let { history }: { history: Promise<components['schemas']['DeliveryHistory'] | null> } = $props();

	const pct = new Intl.NumberFormat('en-BD', { style: 'percent' });
	const tones = { new: 'info', good: 'success', mixed: 'warning', risky: 'danger' } as const;
</script>

<Card title={t.title} level={2}>
	{#await history}
		<Skeleton lines={3} />
	{:then h}
		{#if !h}
			<p class="muted">{t.failed}</p>
		{:else}
			{@const total = h.delivered + h.cancelled}
			<Alert tone={tones[h.verdict]} title={t.verdicts[h.verdict]}>
				{#if total}{t.summary(
						h.delivered,
						total,
						pct.format(h.delivered / total)
					)}{:else}{t.nothing}{/if}
			</Alert>
			<dl>
				<dt>{t.shop}</dt>
				<dd>
					{t.counts(h.shop.delivered, h.shop.cancelled)}{#if h.shop.open}, {t.open(
							h.shop.open
						)}{/if}
				</dd>
				{#each h.couriers as c (c.code)}
					<dt>{c.name}</dt>
					{#if c.error}
						<dd class="muted">{c.error}</dd>
					{:else}
						<dd>{t.counts(c.delivered ?? 0, c.cancelled ?? 0)}</dd>
					{/if}
				{/each}
			</dl>
			{#if !h.couriers.length}<p class="muted">{t.addCourier}</p>{/if}
		{/if}
	{/await}
</Card>

<style>
	dl {
		display: grid;
		grid-template-columns: auto 1fr;
		gap: 0.375rem 1rem;
		margin: 0.75rem 0 0;
	}
	dt {
		color: var(--text-secondary);
	}
	dd {
		margin: 0;
		text-align: end;
	}
	.muted {
		margin: 0.75rem 0 0;
		color: var(--text-secondary);
		font-size: 0.875rem;
	}
	dd.muted {
		margin: 0;
	}
</style>
