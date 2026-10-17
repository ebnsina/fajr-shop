<script lang="ts">
	import { deserialize, enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import type { components } from '#lib/api.js';
	import DistrictPicker from '#lib/admin/DistrictPicker.svelte';
	import { errorText, shippingAdmin as t, ph } from '#lib/copy.js';
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
	import Switch from '#lib/sinaui/ui/Switch.svelte';
	import { toast } from '#lib/sinaui/ui/toast/index.js';
	import type { PageProps } from './$types';

	type Zone = components['schemas']['ShippingZone'];
	let { data, form }: PageProps = $props();

	const money = { style: 'currency', currency: 'BDT', currencyDisplay: 'narrowSymbol' } as const;
	const fields = (action: string) =>
		(form?.action === action ? form.fields : {}) as Record<string, string>;
	/** Which active zone has each district, leaving out the zone being edited. */
	const takenBy = (except?: string) =>
		Object.fromEntries(
			data.zones
				.filter((z) => z.active && z.id !== except)
				.flatMap((z) => z.districts.map((d) => [d, z.name]))
		);

	let picked = $state<string[]>([]);
	let editing = $state<Zone | null>(null);
	let editPicked = $state<string[]>([]);
	let editOpen = $state(false);

	function edit(z: Zone) {
		editing = z;
		editPicked = [...z.districts];
		editOpen = true;
	}

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

{#snippet zoneFields(z: Zone | null, action: string)}
	<Input
		label={t.name}
		name="name"
		value={z?.name}
		placeholder={t.namePlaceholder}
		required
		maxlength={60}
		error={fields(action).name}
	/>
	<Input
		label={t.days}
		name="delivery_days"
		value={z?.delivery_days}
		placeholder={t.daysPlaceholder}
		required
		maxlength={40}
		error={fields(action).delivery_days}
	/>
	<div class="row">
		<NumberField
			label={t.baseCharge}
			name="base_charge"
			value={z ? toTaka(z.base_charge) : 70}
			min={0}
			step={10}
			format={money}
			hint={t.baseChargeHint}
		/>
		<NumberField
			label={t.baseWeight}
			name="base_weight_kg"
			value={z ? z.base_weight_g / 1000 : 1}
			min={0}
			step={0.5}
		/>
	</div>
	<div class="row">
		<NumberField
			label={t.extraPerKg}
			name="extra_per_kg"
			value={z ? toTaka(z.extra_per_kg) : 20}
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
			value={z?.free_over ? toTaka(z.free_over) : ''}
			hint={t.freeOverHint}
		/>
	</div>
	<Switch name="active" checked={z?.active ?? true}>{t.active}</Switch>
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
					if (result.type === 'success') {
						picked = [];
						toast.success(t.saved);
					}
				}}
		>
			{#if form?.action === 'create' && form.message}<Alert
					tone="danger"
					title={form.message}
					live
				/>{/if}
			{@render zoneFields(null, 'create')}
			<DistrictPicker
				districts={data.districts}
				takenBy={takenBy()}
				bind:value={picked}
				error={fields('create').districts}
			/>
			<div><Button type="submit">{t.add}</Button></div>
		</form>
	</Card>

	<div class="list">
		{#if data.zones.length}
			<ul class="zones">
				{#each data.zones as z (z.id)}
					<li class={[!z.active && 'off']}>
						<div class="info">
							<p class="zname">
								{z.name}
								{#if !z.active}<Badge icon={false}>{t.hidden}</Badge>{/if}
							</p>
							<p class="price">
								{t.summary(formatMoney(z.base_charge), String(z.base_weight_g / 1000))}
								{#if z.extra_per_kg}· {t.extra(formatMoney(z.extra_per_kg))}{/if}
								{#if z.free_over}· {t.freeFrom(formatMoney(z.free_over))}{/if}
							</p>
							<p class="meta">{z.delivery_days} · {t.districtCount(z.districts.length)}</p>
							<p class="districts">
								{z.districts.slice(0, 12).join(', ')}{z.districts.length > 12 ? '…' : ''}
							</p>
						</div>
						<div class="buttons">
							<Button variant="ghost" size="sm" onclick={() => edit(z)}>{t.edit}</Button>
							<ConfirmButton size="sm" confirm={t.deleteConfirm} onconfirm={() => remove(z.id)}
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

<Dialog bind:open={editOpen} title={t.editTitle} class="zone-dialog">
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
				{@render zoneFields(editing, 'update')}
				<DistrictPicker
					districts={data.districts}
					takenBy={takenBy(editing.id)}
					bind:value={editPicked}
					error={fields('update').districts}
				/>
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
	.zones {
		display: grid;
		gap: 0.75rem;
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.zones li {
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
	.zname {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 1.0625rem;
		font-weight: 600;
	}
	.price {
		font-variant-numeric: tabular-nums;
	}
	.meta,
	.districts {
		color: var(--ui-muted);
		font-size: 0.8125rem;
	}
	.buttons {
		display: flex;
		gap: 0.5rem;
	}
	:global(.dialog.zone-dialog) {
		inline-size: min(48rem, 100vw);
	}
</style>
