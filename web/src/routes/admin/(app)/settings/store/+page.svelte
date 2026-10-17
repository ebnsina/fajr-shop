<script lang="ts">
	import { enhance } from '$app/forms';
	import { storeSettings as t } from '#lib/copy.js';
	import Alert from '#lib/sinaui/ui/Alert.svelte';
	import Button from '#lib/sinaui/ui/Button.svelte';
	import Card from '#lib/sinaui/ui/Card.svelte';
	import ColorPicker from '#lib/sinaui/ui/ColorPicker.svelte';
	import Input from '#lib/sinaui/ui/Input.svelte';
	import NumberField from '#lib/sinaui/ui/NumberField.svelte';
	import Switch from '#lib/sinaui/ui/Switch.svelte';
	import { toast } from '#lib/sinaui/ui/toast/index.js';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	// After a refused save, show what was typed rather than what is stored.
	const store = $derived(form?.values ?? data.store);
	const fields = $derived<Record<string, string>>(form?.fields ?? {});
	let vatOn = $derived(store.vat.enabled);
	let saving = $state(false);
</script>

<svelte:head><title>{t.title} · {data.store.name}</title></svelte:head>

<div class="head">
	<h1>{t.title}</h1>
	<p>{t.description}</p>
</div>

<form
	method="POST"
	novalidate
	use:enhance={() => {
		saving = true;
		return async ({ result, update }) => {
			await update({ reset: false });
			saving = false;
			if (result.type === 'success') toast.success(t.saved);
		};
	}}
>
	{#if form?.message}<Alert tone="danger" title={form.message} live />{/if}

	<Card title={t.identity} level={2}>
		<div class="fields">
			<Input
				label={t.name}
				name="name"
				value={store.name}
				required
				maxlength={80}
				error={fields.name}
			/>
			<ColorPicker
				label={t.accent}
				name="accent_color"
				value={store.accent_color ?? '#047857'}
				hint={t.accentHint}
			/>
			<Input
				label={t.contactPhone}
				name="contact_phone"
				type="tel"
				autocomplete="tel"
				value={store.contact_phone}
				hint={t.contactHint}
				error={fields.contact_phone}
			/>
			<Input
				label={t.contactEmail}
				name="contact_email"
				type="email"
				autocomplete="email"
				value={store.contact_email}
				error={fields.contact_email}
			/>
			<Input label={t.currency} value={t.currencyValue} readonly />
		</div>
	</Card>

	<Card title={t.vat} level={2}>
		<div class="fields">
			<div>
				<Switch name="vat_enabled" bind:checked={vatOn}>{t.vatEnabled}</Switch>
				<p class="hint">{t.vatHint}</p>
			</div>
			{#if vatOn}
				<NumberField
					label={t.vatRate}
					name="vat_rate"
					value={store.vat.rate_bp / 100}
					min={0}
					max={100}
					step={0.5}
					format={{ style: 'unit', unit: 'percent', maximumFractionDigits: 2 }}
					error={fields['vat.rate_bp']}
				/>
				<div>
					<Switch name="prices_include_vat" checked={store.vat.prices_include_vat}
						>{t.pricesIncludeVat}</Switch
					>
					<p class="hint">{t.pricesIncludeVatHint}</p>
				</div>
				<Input
					label={t.bin}
					name="vat_bin"
					value={store.vat.bin}
					hint={t.binHint}
					error={fields['vat.bin']}
				/>
			{:else}
				<!-- Kept while VAT is off, so turning it back on restores them. -->
				<input type="hidden" name="vat_rate" value={store.vat.rate_bp / 100} />
				{#if store.vat.prices_include_vat}<input
						type="hidden"
						name="prices_include_vat"
						value="on"
					/>{/if}
				<input type="hidden" name="vat_bin" value={store.vat.bin ?? ''} />
			{/if}
		</div>
	</Card>

	<div class="actions"><Button type="submit" loading={saving}>{t.save}</Button></div>
</form>

<style>
	.head h1 {
		margin: 0 0 0.25rem;
		font-size: 1.5rem;
	}
	.head p,
	.hint {
		margin: 0;
		color: var(--ui-muted);
	}
	.head {
		margin-block-end: 1.5rem;
	}
	.hint {
		margin-block-start: 0.25rem;
		font-size: 0.875rem;
	}
	form {
		display: grid;
		gap: 1rem;
	}
	.fields {
		display: grid;
		gap: 1rem;
	}
	.actions {
		display: flex;
		justify-content: end;
	}
</style>
