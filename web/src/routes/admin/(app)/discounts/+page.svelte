<script lang="ts">
	import { deserialize, enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import type { components } from '#lib/api.js';
	import { discountAdmin as t, errorText } from '#lib/copy.js';
	import { formatMoney, toTaka } from '#lib/money.js';
	import Alert from '#lib/sinaui/ui/Alert.svelte';
	import Badge from '#lib/sinaui/ui/Badge.svelte';
	import Button from '#lib/sinaui/ui/Button.svelte';
	import Card from '#lib/sinaui/ui/Card.svelte';
	import ConfirmButton from '#lib/sinaui/ui/ConfirmButton.svelte';
	import Dialog from '#lib/sinaui/ui/Dialog.svelte';
	import EmptyState from '#lib/sinaui/ui/EmptyState.svelte';
	import Input from '#lib/sinaui/ui/Input.svelte';
	import NumberField from '#lib/sinaui/ui/NumberField.svelte';
	import Segmented from '#lib/sinaui/ui/Segmented.svelte';
	import Switch from '#lib/sinaui/ui/Switch.svelte';
	import { toast } from '#lib/sinaui/ui/toast/index.js';
	import type { PageProps } from './$types';

	type Discount = components['schemas']['Discount'];
	let { data, form }: PageProps = $props();

	const money = { style: 'currency', currency: 'BDT', currencyDisplay: 'narrowSymbol' } as const;
	const pct = new Intl.NumberFormat('en-BD', { style: 'percent' });
	const day = new Intl.DateTimeFormat('en-BD', { dateStyle: 'medium', timeZone: 'Asia/Dhaka' });
	// "2026-04-01 10:00" in Dhaka time, the shape a datetime-local field takes.
	const fieldTime = new Intl.DateTimeFormat('sv-SE', {
		timeZone: 'Asia/Dhaka',
		dateStyle: 'short',
		timeStyle: 'short'
	});
	const local = (iso?: string | null) =>
		iso ? fieldTime.format(new Date(iso)).replace(' ', 'T') : '';

	const fields = (action: string) =>
		((form?.action === action && form.fields) || {}) as Record<string, string>;

	let addKind = $state('percent');
	let editing = $state<Discount | null>(null);
	let editKind = $state('percent');
	let editOpen = $state(false);

	function edit(d: Discount) {
		editing = d;
		editKind = d.kind;
		editOpen = true;
	}

	function status(d: Discount): { label: string; tone: 'neutral' | 'accent' | 'warning' } {
		const now = Date.now();
		if (!d.active) return { label: t.off, tone: 'neutral' };
		if (d.starts_at && Date.parse(d.starts_at) > now)
			return { label: t.scheduled, tone: 'warning' };
		if (d.ends_at && Date.parse(d.ends_at) <= now) return { label: t.ended, tone: 'neutral' };
		if (d.usage_limit && d.used_count >= d.usage_limit) return { label: t.usedUp, tone: 'neutral' };
		return { label: t.active, tone: 'accent' };
	}

	const summary = (d: Discount) =>
		[
			d.kind === 'percent'
				? t.takesOff(pct.format(d.value / 100)) +
					(d.max_discount ? `, ${t.upTo(formatMoney(d.max_discount))}` : '')
				: t.takesOff(formatMoney(d.value)),
			d.min_subtotal ? t.over(formatMoney(d.min_subtotal)) : ''
		]
			.filter(Boolean)
			.join(' ');

	const dates = (d: Discount) =>
		[
			d.starts_at && t.from(day.format(new Date(d.starts_at))),
			d.ends_at && t.until(day.format(new Date(d.ends_at)))
		]
			.filter(Boolean)
			.join(' ');

	async function remove(id: string) {
		const body = new FormData();
		body.set('id', id);
		const res = await fetch('?/delete', {
			method: 'POST',
			body,
			headers: { 'x-sveltekit-action': 'true' }
		});
		const result = deserialize(await res.text());
		if (result.type === 'failure') {
			toast.error(String(result.data?.message ?? errorText('internal')));
			return;
		}
		toast.success(t.deleted);
		await invalidateAll();
	}
</script>

<svelte:head><title>{t.title} · {data.store.name}</title></svelte:head>

<div class="head">
	<h1>{t.title}</h1>
	<p>{t.description}</p>
</div>

{#snippet discountFields(d: Discount | null, action: string, kind: string)}
	<Input
		label={t.code}
		name="code"
		value={d?.code}
		placeholder={t.codePlaceholder}
		required
		maxlength={30}
		autocapitalize="characters"
		hint={t.codeHint}
		error={fields(action).code}
	/>
	<Input
		label={t.about}
		name="description"
		value={d?.description ?? ''}
		placeholder={t.aboutPlaceholder}
		maxlength={120}
		error={fields(action).description}
	/>
	<div class="row">
		{#if kind === 'percent'}
			<NumberField
				label={t.percent}
				name="value"
				value={d?.kind === 'percent' ? d.value : 10}
				min={1}
				max={100}
				step={5}
				format={{ style: 'unit', unit: 'percent' }}
				error={fields(action).value}
			/>
			<Input
				label={t.cap}
				name="max_discount"
				type="number"
				inputmode="numeric"
				min="1"
				value={d?.max_discount ? toTaka(d.max_discount) : ''}
				placeholder={t.capPlaceholder}
				hint={t.capHint}
				error={fields(action).max_discount}
			/>
		{:else}
			<NumberField
				label={t.amount}
				name="value"
				value={d?.kind === 'fixed' ? toTaka(d.value) : 100}
				min={1}
				step={50}
				format={money}
				error={fields(action).value}
			/>
		{/if}
	</div>
	<div class="row">
		<Input
			label={t.min}
			name="min_subtotal"
			type="number"
			inputmode="numeric"
			min="0"
			value={d?.min_subtotal ? toTaka(d.min_subtotal) : ''}
			placeholder={t.minPlaceholder}
			error={fields(action).min_subtotal}
		/>
		<Input
			label={t.limit}
			name="usage_limit"
			type="number"
			inputmode="numeric"
			min="1"
			value={d?.usage_limit ?? ''}
			placeholder={t.limitPlaceholder}
			hint={t.limitHint}
			error={fields(action).usage_limit}
		/>
	</div>
	<div class="row">
		<Input
			label={t.starts}
			name="starts_at"
			type="datetime-local"
			value={local(d?.starts_at)}
			error={fields(action).starts_at}
		/>
		<Input
			label={t.ends}
			name="ends_at"
			type="datetime-local"
			value={local(d?.ends_at)}
			error={fields(action).ends_at}
		/>
	</div>
	<Switch name="active" checked={d?.active ?? true}>{t.active}</Switch>
{/snippet}

<div class="split">
	<Card title={t.add} level={2}>
		<form
			method="POST"
			action="?/create"
			class="form"
			use:enhance={() =>
				async ({ result, update }) => {
					await update({ reset: result.type === 'success' });
					if (result.type === 'success') toast.success(t.saved);
				}}
		>
			{#if form?.action === 'create' && form.message}<Alert
					tone="danger"
					title={form.message}
					live
				/>{/if}
			<Segmented label={t.kind} name="kind" options={t.kinds} bind:value={addKind} />
			{@render discountFields(null, 'create', addKind)}
			<div><Button type="submit">{t.add}</Button></div>
		</form>
	</Card>

	<div class="list">
		{#if data.discounts.length}
			<ul class="codes">
				{#each data.discounts as d (d.id)}
					{@const s = status(d)}
					<li class={[s.tone === 'neutral' && 'off']}>
						<div class="info">
							<p class="code">
								<span>{d.code}</span>
								<Badge tone={s.tone} icon={false}>{s.label}</Badge>
							</p>
							<p>{summary(d)}</p>
							{#if d.description}<p class="meta">{d.description}</p>{/if}
							<p class="meta">
								{t.used(d.used_count, d.usage_limit)}{dates(d) ? ` · ${dates(d)}` : ''}
							</p>
						</div>
						<div class="buttons">
							<Button variant="ghost" size="sm" onclick={() => edit(d)}>{t.edit}</Button>
							<ConfirmButton size="sm" confirm={t.deleteConfirm} onconfirm={() => remove(d.id)}
								>{t.delete}</ConfirmButton
							>
						</div>
					</li>
				{/each}
			</ul>
		{:else}
			<EmptyState title={t.emptyTitle}>{t.emptyBody}</EmptyState>
		{/if}
	</div>
</div>

<Dialog bind:open={editOpen} title={t.editTitle} class="discount-dialog">
	{#if editing}
		{#key editing.id}
			<form
				method="POST"
				action="?/update"
				class="form"
				use:enhance={() =>
					async ({ result, update }) => {
						await update({ reset: false });
						if (result.type === 'success') {
							editOpen = false;
							toast.success(t.saved);
						}
					}}
			>
				<input type="hidden" name="id" value={editing.id} />
				{#if form?.action === 'update' && form.message}<Alert
						tone="danger"
						title={form.message}
						live
					/>{/if}
				<Segmented label={t.kind} name="kind" options={t.kinds} bind:value={editKind} />
				{@render discountFields(editing, 'update', editKind)}
				<div><Button type="submit">{t.save}</Button></div>
			</form>
		{/key}
	{/if}
</Dialog>

<style>
	.form {
		display: grid;
		gap: 1rem;
	}
	.row {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.75rem;
		align-items: start;
	}
	.codes {
		display: grid;
		gap: 0.75rem;
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.codes li {
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
		gap: 0.25rem;
		min-inline-size: 14rem;
	}
	.info p {
		margin: 0;
	}
	.code {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
	.code span {
		font-family: var(--ui-font-mono);
		font-size: 1.0625rem;
		font-weight: 600;
		letter-spacing: 0.02em;
	}
	.meta {
		color: var(--ui-muted);
		font-size: 0.8125rem;
	}
	.buttons {
		display: flex;
		gap: 0.5rem;
	}
	:global(.dialog.discount-dialog) {
		inline-size: min(40rem, 100vw);
	}
	@media (width < 40rem) {
		.row {
			grid-template-columns: minmax(0, 1fr);
		}
	}
</style>
