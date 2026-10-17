<script lang="ts">
	import type { components } from '#lib/api.js';
	import { runAction } from '#lib/admin/actions.js';
	import DistrictPicker from '#lib/admin/DistrictPicker.svelte';
	import RowMenu from '#lib/admin/RowMenu.svelte';
	import StepForm from '#lib/admin/StepForm.svelte';
	import { admin as a, ph, shippingAdmin as t } from '#lib/copy.js';
	import { formatMoney, toTaka } from '#lib/money.js';
	import AlertDialog from '#lib/sinaui/ui/AlertDialog.svelte';
	import Badge from '#lib/sinaui/ui/Badge.svelte';
	import Button from '#lib/sinaui/ui/Button.svelte';
	import Card from '#lib/sinaui/ui/Card.svelte';
	import EmptyState from '#lib/sinaui/ui/EmptyState.svelte';
	import Input from '#lib/sinaui/ui/Input.svelte';
	import NumberField from '#lib/sinaui/ui/NumberField.svelte';
	import Switch from '#lib/sinaui/ui/Switch.svelte';
	import Table from '#lib/sinaui/ui/Table.svelte';
	import { toast } from '#lib/sinaui/ui/toast/index.js';
	import type { PageProps } from './$types';

	type Zone = components['schemas']['ShippingZone'];
	let { data, form }: PageProps = $props();

	const money = { style: 'currency', currency: 'BDT', currencyDisplay: 'narrowSymbol' } as const;
	const fields = $derived(
		((form && 'fields' in form && form.fields) || {}) as Record<string, string>
	);
	/** Which active zone has each district, leaving out the zone being edited. */
	const takenBy = (except?: string) =>
		Object.fromEntries(
			data.zones
				.filter((z) => z.active && z.id !== except)
				.flatMap((z) => z.districts.map((d) => [d, z.name]))
		);

	let open = $state(false);
	let editing = $state<Zone | null>(null);
	let picked = $state<string[]>([]);
	let removing = $state<Zone | null>(null);

	function show(z: Zone | null) {
		editing = z;
		picked = z ? [...z.districts] : [];
		open = true;
	}
</script>

<svelte:head><title>{t.title} · {data.store.name}</title></svelte:head>

<div class="head">
	<div>
		<h1>{t.title}</h1>
		<p>{t.description}</p>
	</div>
	<Button onclick={() => show(null)}>{t.add}</Button>
</div>

{#if data.zones.length}
	<Card>
		<Table caption={t.title} hideCaption>
			<thead>
				<tr>
					<th scope="col">{t.zoneCol}</th>
					<th scope="col" class="num">{t.baseCharge}</th>
					<th scope="col" class="num">{t.extraPerKg}</th>
					<th scope="col" class="num">{t.freeCol}</th>
					<th scope="col">{t.days}</th>
					<th scope="col">{t.statusCol}</th>
					<th scope="col"><span class="sr">{a.actions('')}</span></th>
				</tr>
			</thead>
			<tbody>
				{#each data.zones as z (z.id)}
					<tr>
						<td>
							<strong>{z.name}</strong>
							<span class="muted"
								>{t.districtCount(z.districts.length)} · {z.districts.slice(0, 4).join(', ')}{z
									.districts.length > 4
									? '…'
									: ''}</span
							>
						</td>
						<td class="num"
							>{t.summary(formatMoney(z.base_charge), String(z.base_weight_g / 1000))}</td
						>
						<td class="num">{z.extra_per_kg ? formatMoney(z.extra_per_kg) : '—'}</td>
						<td class="num">{z.free_over ? formatMoney(z.free_over) : '—'}</td>
						<td>{z.delivery_days}</td>
						<td>
							<Badge tone={z.active ? 'accent' : 'neutral'} icon={false}
								>{z.active ? t.delivering : t.hidden}</Badge
							>
						</td>
						<td class="menu">
							<RowMenu
								label={a.actions(z.name)}
								actions={[
									{ label: a.edit, onselect: () => show(z) },
									{ label: a.delete, danger: true, separate: true, onselect: () => (removing = z) }
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
			{ label: t.stepZone, body: zone },
			{ label: t.stepCharges, body: charges },
			{ label: t.districts, body: districts }
		]}
	/>
{/key}

{#snippet zone()}
	{#if editing}<input type="hidden" name="id" value={editing.id} />{/if}
	<Input
		label={t.name}
		name="name"
		value={editing?.name}
		placeholder={t.namePlaceholder}
		required
		maxlength={60}
		error={fields.name}
	/>
	<Input
		label={t.days}
		name="delivery_days"
		value={editing?.delivery_days}
		placeholder={t.daysPlaceholder}
		required
		maxlength={40}
		error={fields.delivery_days}
	/>
	<Switch name="active" checked={editing?.active ?? true}>{t.active}</Switch>
{/snippet}

{#snippet charges()}
	<div class="row">
		<NumberField
			label={t.baseCharge}
			name="base_charge"
			value={editing ? toTaka(editing.base_charge) : 70}
			min={0}
			step={10}
			format={money}
			hint={t.baseChargeHint}
		/>
		<NumberField
			label={t.baseWeight}
			name="base_weight_kg"
			value={editing ? editing.base_weight_g / 1000 : 1}
			min={0}
			step={0.5}
		/>
	</div>
	<div class="row">
		<NumberField
			label={t.extraPerKg}
			name="extra_per_kg"
			value={editing ? toTaka(editing.extra_per_kg) : 20}
			min={0}
			step={5}
			format={money}
		/>
		<Input
			label={t.freeOver}
			placeholder={ph.freeOver}
			name="free_over"
			type="number"
			inputmode="numeric"
			min="0"
			value={editing?.free_over ? toTaka(editing.free_over) : ''}
			hint={t.freeOverHint}
		/>
	</div>
{/snippet}

{#snippet districts()}
	<DistrictPicker
		districts={data.districts}
		takenBy={takenBy(editing?.id)}
		bind:value={picked}
		error={fields.districts}
	/>
{/snippet}

{#if removing}
	<AlertDialog
		open
		title={a.deleteTitle(removing.name)}
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
	.muted {
		display: block;
		color: var(--text-secondary);
		font-size: 0.8125rem;
	}
	.menu {
		inline-size: 1%;
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
