<script lang="ts">
	import type { components } from '#lib/api.js';
	import { runAction } from '#lib/admin/actions.js';
	import RowMenu from '#lib/admin/RowMenu.svelte';
	import StepForm from '#lib/admin/StepForm.svelte';
	import { admin as a, discountAdmin as t } from '#lib/copy.js';
	import { formatMoney, toTaka } from '#lib/money.js';
	import AlertDialog from '#lib/sinaui/ui/AlertDialog.svelte';
	import Badge from '#lib/sinaui/ui/Badge.svelte';
	import Button from '#lib/sinaui/ui/Button.svelte';
	import Card from '#lib/sinaui/ui/Card.svelte';
	import Table from '#lib/sinaui/ui/Table.svelte';
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
	const n = new Intl.NumberFormat('en-BD');
	const day = new Intl.DateTimeFormat('en-BD', { dateStyle: 'medium', timeZone: 'Asia/Dhaka' });
	// "2026-04-01T10:00" in Dhaka time, the shape a datetime-local field takes.
	const fieldTime = new Intl.DateTimeFormat('sv-SE', {
		timeZone: 'Asia/Dhaka',
		dateStyle: 'short',
		timeStyle: 'short'
	});
	const local = (iso?: string | null) =>
		iso ? fieldTime.format(new Date(iso)).replace(' ', 'T') : '';
	const fields = $derived(
		((form && 'fields' in form && form.fields) || {}) as Record<string, string>
	);

	// One dialog for adding and editing: editing is the code being changed, or null for a new one.
	let open = $state(false);
	let editing = $state<Discount | null>(null);
	let kind = $state('percent');
	let removing = $state<Discount | null>(null);

	function show(d: Discount | null) {
		editing = d;
		kind = d?.kind ?? 'percent';
		open = true;
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
	const amount = (d: Discount) =>
		d.kind === 'percent'
			? t.takesOff(pct.format(d.value / 100)) +
				(d.max_discount ? `, ${t.upTo(formatMoney(d.max_discount))}` : '')
			: t.takesOff(formatMoney(d.value));
	const when = (d: Discount) =>
		[
			d.starts_at && t.from(day.format(new Date(d.starts_at))),
			d.ends_at && t.until(day.format(new Date(d.ends_at)))
		]
			.filter(Boolean)
			.join(' ') || '—';
</script>

<svelte:head><title>{t.title} · {data.store.name}</title></svelte:head>

<div class="head">
	<div>
		<h1>{t.title}</h1>
		<p>{t.description}</p>
	</div>
	<Button onclick={() => show(null)}>{t.add}</Button>
</div>

{#if data.discounts.length}
	<Card>
		<Table caption={t.title} hideCaption>
			<thead>
				<tr>
					<th scope="col">{t.code}</th>
					<th scope="col">{t.amountCol}</th>
					<th scope="col" class="num">{t.minCol}</th>
					<th scope="col">{t.dates}</th>
					<th scope="col" class="num">{t.usedCol}</th>
					<th scope="col">{t.status}</th>
					<th scope="col"><span class="sr">{a.actions('')}</span></th>
				</tr>
			</thead>
			<tbody>
				{#each data.discounts as d (d.id)}
					{@const s = status(d)}
					<tr>
						<td>
							<span class="code">{d.code}</span>
							{#if d.description}<span class="muted">{d.description}</span>{/if}
						</td>
						<td>{amount(d)}</td>
						<td class="num">{d.min_subtotal ? formatMoney(d.min_subtotal) : '—'}</td>
						<td class="muted">{when(d)}</td>
						<td class="num"
							>{n.format(d.used_count)}{d.usage_limit ? ` / ${n.format(d.usage_limit)}` : ''}</td
						>
						<td><Badge tone={s.tone} icon={false}>{s.label}</Badge></td>
						<td class="menu">
							<RowMenu
								label={a.actions(d.code)}
								actions={[
									{ label: a.edit, onselect: () => show(d) },
									{ label: a.delete, danger: true, separate: true, onselect: () => (removing = d) }
								]}
							/>
						</td>
					</tr>
				{/each}
			</tbody>
		</Table>
	</Card>
{:else}
	<EmptyState title={t.emptyTitle}>
		{t.emptyBody}
		{#snippet actions()}<Button onclick={() => show(null)}>{t.add}</Button>{/snippet}
	</EmptyState>
{/if}

{#key editing?.id ?? 'new'}
	<StepForm
		bind:open
		title={editing ? t.editTitle : t.add}
		action={editing ? '?/update' : '?/create'}
		submitLabel={editing ? t.save : t.add}
		message={form && 'message' in form ? form.message : undefined}
		onsaved={() => toast.success(t.saved)}
		steps={[
			{ label: t.stepWhat, body: what },
			{ label: t.stepRules, body: rules },
			{ label: t.stepWhen, body: timing }
		]}
	/>
{/key}

{#snippet what()}
	{#if editing}<input type="hidden" name="id" value={editing.id} />{/if}
	<Input
		label={t.code}
		name="code"
		value={editing?.code}
		placeholder={t.codePlaceholder}
		required
		maxlength={30}
		pattern={'[A-Za-z0-9_\\-]{3,30}'}
		autocapitalize="characters"
		hint={t.codeHint}
		error={fields.code}
	/>
	<Input
		label={t.about}
		name="description"
		value={editing?.description ?? ''}
		placeholder={t.aboutPlaceholder}
		maxlength={120}
		error={fields.description}
	/>
	<Segmented label={t.kind} name="kind" options={t.kinds} bind:value={kind} />
	<div class="row">
		{#if kind === 'percent'}
			<NumberField
				label={t.percent}
				name="value"
				value={editing?.kind === 'percent' ? editing.value : 10}
				min={1}
				max={100}
				step={5}
				format={{ style: 'unit', unit: 'percent' }}
				error={fields.value}
			/>
			<Input
				label={t.cap}
				name="max_discount"
				type="number"
				inputmode="numeric"
				min="1"
				value={editing?.max_discount ? toTaka(editing.max_discount) : ''}
				placeholder={t.capPlaceholder}
				hint={t.capHint}
				error={fields.max_discount}
			/>
		{:else}
			<NumberField
				label={t.amount}
				name="value"
				value={editing?.kind === 'fixed' ? toTaka(editing.value) : 100}
				min={1}
				step={50}
				format={money}
				error={fields.value}
			/>
		{/if}
	</div>
{/snippet}

{#snippet rules()}
	<Input
		label={t.min}
		name="min_subtotal"
		type="number"
		inputmode="numeric"
		min="0"
		value={editing?.min_subtotal ? toTaka(editing.min_subtotal) : ''}
		placeholder={t.minPlaceholder}
		error={fields.min_subtotal}
	/>
	<Input
		label={t.limit}
		name="usage_limit"
		type="number"
		inputmode="numeric"
		min="1"
		value={editing?.usage_limit ?? ''}
		placeholder={t.limitPlaceholder}
		hint={t.limitHint}
		error={fields.usage_limit}
	/>
{/snippet}

{#snippet timing()}
	<div class="row">
		<Input
			label={t.starts}
			name="starts_at"
			type="datetime-local"
			value={local(editing?.starts_at)}
			error={fields.starts_at}
		/>
		<Input
			label={t.ends}
			name="ends_at"
			type="datetime-local"
			value={local(editing?.ends_at)}
			error={fields.ends_at}
		/>
	</div>
	<Switch name="active" checked={editing?.active ?? true}>{t.active}</Switch>
{/snippet}

{#if removing}
	<AlertDialog
		open
		title={a.deleteTitle(removing.code)}
		description={a.deleteBody}
		confirmLabel={a.delete}
		tone="danger"
		onconfirm={async () => {
			await runAction('delete', { id: removing!.id });
			removing = null;
			toast.success(t.deleted);
		}}
	/>
{/if}

<style>
	.menu {
		inline-size: 1%;
	}
	.code {
		display: block;
		font-family: var(--ui-font-mono);
		font-weight: 600;
		letter-spacing: 0.02em;
	}
	.muted {
		display: block;
		color: var(--text-secondary);
	}
	td.muted {
		display: table-cell;
	}
	.row {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.75rem;
		align-items: start;
	}
	.sr {
		position: absolute;
		inline-size: 1px;
		block-size: 1px;
		overflow: hidden;
		clip-path: inset(50%);
	}
	@media (width < 40rem) {
		.row {
			grid-template-columns: minmax(0, 1fr);
		}
	}
</style>
