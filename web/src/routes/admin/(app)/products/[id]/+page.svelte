<script lang="ts">
	import { applyAction, deserialize, enhance } from '$app/forms';
	import { goto, invalidateAll } from '$app/navigation';
	import { untrack } from 'svelte';
	import { Cancel01Icon } from '@hugeicons/core-free-icons';
	import type { components } from '#lib/api.js';
	import { errorText, productStatus, productEditor as t } from '#lib/copy.js';
	import { toPoisha, toTaka } from '#lib/money.js';
	import Alert from '#lib/sinaui/ui/Alert.svelte';
	import Button from '#lib/sinaui/ui/Button.svelte';
	import Card from '#lib/sinaui/ui/Card.svelte';
	import ConfirmButton from '#lib/sinaui/ui/ConfirmButton.svelte';
	import Dialog from '#lib/sinaui/ui/Dialog.svelte';
	import FileDrop from '#lib/sinaui/ui/FileDrop.svelte';
	import Icon from '#lib/sinaui/ui/Icon.svelte';
	import Input from '#lib/sinaui/ui/Input.svelte';
	import NumberField from '#lib/sinaui/ui/NumberField.svelte';
	import Segmented from '#lib/sinaui/ui/Segmented.svelte';
	import Select from '#lib/sinaui/ui/Select.svelte';
	import Sortable from '#lib/sinaui/ui/Sortable.svelte';
	import TagInput from '#lib/sinaui/ui/TagInput.svelte';
	import Textarea from '#lib/sinaui/ui/Textarea.svelte';
	import { toast } from '#lib/sinaui/ui/toast/index.js';
	import type { PageProps } from './$types';

	type Product = components['schemas']['Product'];
	type Status = components['schemas']['ProductStatus'];
	type Image = { id: string; url: string };
	type Row = { id?: string; price?: number; compare?: number; sku: string; stock: number };

	let { data, form }: PageProps = $props();

	const money = { style: 'currency', currency: 'BDT', currencyDisplay: 'narrowSymbol' } as const;
	const comboKey = (values: string[]) => values.map((v) => v.toLowerCase()).join('\u0000');

	function fromProduct(p: Product | null) {
		const options = (p?.options ?? []).map((o) => ({ name: o.name, values: [...o.values] }));
		const rows: Record<string, Row> = {};
		for (const v of p?.variants ?? []) {
			rows[comboKey(options.map((o) => v.options[o.name] ?? ''))] = {
				id: v.id,
				price: toTaka(v.price),
				compare: v.compare_at_price == null ? undefined : toTaka(v.compare_at_price),
				sku: v.sku ?? '',
				stock: v.stock
			};
		}
		return {
			name: p?.name ?? '',
			description: p?.description ?? '',
			status: (p?.status ?? 'draft') as Status,
			categoryId: p?.category?.id ?? '',
			options,
			rows,
			images: (p?.images ?? []).map((i) => ({ id: i.id, url: i.url })) as Image[]
		};
	}

	let f = $state(fromProduct(untrack(() => data.product)));
	// After a save the page reloads the product; start from what was stored (new variants now have ids).
	let loadedAt = untrack(() => data.product?.updated_at);
	$effect(() => {
		const at = data.product?.updated_at;
		if (at !== loadedAt) {
			loadedAt = at;
			f = fromProduct(untrack(() => data.product));
		}
	});

	// Options that are filled in; the variant grid has one row per combination of their values.
	const active = $derived(f.options.filter((o) => o.name.trim() && o.values.length));
	const combos = $derived(
		active.reduce<string[][]>((acc, o) => acc.flatMap((c) => o.values.map((v) => [...c, v])), [[]])
	);
	$effect.pre(() => {
		for (const c of combos) {
			const k = comboKey(c);
			untrack(() => (f.rows[k] ??= { sku: '', stock: 0 }));
		}
	});

	const fields = $derived<Record<string, string>>(
		form && 'fields' in form && !form.adjustError ? (form.fields ?? {}) : {}
	);
	const payload = $derived(
		JSON.stringify({
			name: f.name,
			description: f.description,
			status: f.status,
			category_id: f.categoryId || null,
			options: active.map((o) => ({ name: o.name.trim(), values: o.values })),
			variants: combos.map((c) => {
				const r = f.rows[comboKey(c)] ?? { sku: '', stock: 0 };
				return {
					...(r.id && { id: r.id }),
					sku: r.sku.trim() || null,
					price: r.price == null ? null : toPoisha(r.price),
					compare_at_price: r.compare == null ? null : toPoisha(r.compare),
					stock: r.stock,
					options: Object.fromEntries(active.map((o, i) => [o.name.trim(), c[i]]))
				};
			}),
			image_ids: f.images.map((i) => i.id)
		})
	);

	let saving = $state(false);
	let uploading = $state(0);
	let uploadError = $state('');

	async function upload(files: File[]) {
		uploadError = '';
		for (const file of files) {
			uploading++;
			const body = new FormData();
			body.set('file', file);
			const res = await fetch('/admin/uploads', { method: 'POST', body });
			const json = await res.json().catch(() => ({}));
			uploading--;
			if (res.ok) f.images.push({ id: json.id, url: json.url });
			else uploadError = errorText(json.code);
		}
	}

	// Stock adjustments
	let adjusting = $state<{ id: string; label: string } | null>(null);
	let adjustOpen = $state(false);
	const stockOf = (id: string) => data.product?.variants.find((v) => v.id === id)?.stock ?? 0;

	async function remove() {
		const res = await fetch('?/delete', {
			method: 'POST',
			body: new FormData(),
			headers: { 'x-sveltekit-action': 'true' }
		});
		const result = deserialize(await res.text());
		if (result.type === 'redirect') {
			toast.success(t.deleted);
			await goto(result.location, { invalidateAll: true });
		} else await applyAction(result);
	}

	const categoryOptions = $derived.by(() => {
		const byParent = Map.groupBy(data.categories, (c) => c.parent_id ?? '');
		const out: { id: string; label: string }[] = [];
		const walk = (parent: string, depth: number) => {
			for (const c of byParent.get(parent) ?? []) {
				out.push({ id: c.id, label: ' '.repeat(depth) + c.name });
				walk(c.id, depth + 1);
			}
		};
		walk('', 0);
		return out;
	});
	const statuses = (['draft', 'active', 'archived'] as const).map((s) => ({
		value: s,
		label: productStatus[s]
	}));
</script>

<svelte:head>
	<title>{data.product?.name ?? t.newTitle} · {data.store.name}</title>
</svelte:head>

<a class="back" href="/admin/products">← {t.back}</a>
<div class="head">
	<h1>{data.product?.name ?? t.newTitle}</h1>
	{#if data.product?.status === 'active'}
		<Button variant="secondary" href="/products/{data.product.slug}" target="_blank"
			>{t.view}</Button
		>
	{/if}
</div>

<form
	method="POST"
	action="?/save"
	novalidate
	use:enhance={() => {
		saving = true;
		return async ({ result, update }) => {
			saving = false;
			if (result.type === 'redirect' || result.type === 'success') toast.success(t.saved);
			await update({ reset: false });
		};
	}}
>
	<input type="hidden" name="payload" value={payload} />
	{#if form && 'message' in form && form.message}<Alert
			tone="danger"
			title={form.message}
			live
		/>{/if}

	<Card title={t.details} level={2}>
		<div class="fields">
			<Input label={t.name} bind:value={f.name} required maxlength={150} error={fields.name} />
			<Textarea
				label={t.description}
				bind:value={f.description}
				rows={5}
				hint={t.descriptionHint}
				error={fields.description}
			/>
			<Segmented label={t.status} options={statuses} bind:value={f.status} />
			<Select label={t.category} bind:value={f.categoryId} error={fields.category_id}>
				<option value="">{t.noCategory}</option>
				{#each categoryOptions as c (c.id)}<option value={c.id}>{c.label}</option>{/each}
			</Select>
		</div>
	</Card>

	<Card title={t.images} level={2}>
		<div class="fields">
			{#if f.images.length}
				<Sortable
					bind:items={f.images}
					key={(i) => i.id}
					itemLabel={(i) => i.url.split('/').pop() ?? ''}
					label={t.imageOrder}
					layout="grid"
					class="images"
				>
					{#snippet children(img, handle, { index })}
						<div class="image" data-sortable-item>
							<button type="button" class="drag" {...handle}>
								<img src={img.url} alt="" draggable="false" />
								{#if index === 0}<span class="main">{t.images}</span>{/if}
							</button>
							<button
								type="button"
								class="remove"
								aria-label={t.removeImage}
								onclick={() => f.images.splice(index, 1)}
							>
								<Icon icon={Cancel01Icon} size={14} />
							</button>
						</div>
					{/snippet}
				</Sortable>
			{/if}
			<FileDrop
				label={t.addImages}
				accept="image/jpeg,image/png,image/webp"
				multiple
				maxSize={10 * 1024 * 1024}
				hint={t.imagesHint}
				onfiles={upload}
			/>
			{#if uploading}<p class="hint" aria-live="polite">{t.uploading}</p>{/if}
			{#if uploadError || fields.image_ids}<Alert
					tone="danger"
					title={uploadError || fields.image_ids}
					live
				/>{/if}
		</div>
	</Card>

	<Card title={t.options} description={t.optionsHint} level={2}>
		<div class="fields">
			{#each f.options as option, i (i)}
				<div class="option">
					<Input
						label={t.optionName}
						placeholder={t.optionNamePlaceholder}
						bind:value={option.name}
						maxlength={40}
						error={fields[`options.${i}.name`]}
					/>
					<TagInput
						label={t.optionValues}
						placeholder={t.optionValuesPlaceholder}
						bind:value={option.values}
						max={50}
						error={fields[`options.${i}.values`]}
					/>
					<Button variant="ghost" size="sm" onclick={() => f.options.splice(i, 1)}
						>{t.removeOption}</Button
					>
				</div>
			{/each}
			{#if f.options.length < 3}
				<div>
					<Button variant="secondary" onclick={() => f.options.push({ name: '', values: [] })}
						>{t.addOption}</Button
					>
				</div>
			{/if}
		</div>
	</Card>

	<Card title={t.variants} description={t.variantsHint} level={2}>
		{#if fields.variants}<Alert tone="danger" title={fields.variants} />{/if}
		<div class="variants">
			{#each combos as combo, i (comboKey(combo))}
				{@const row = f.rows[comboKey(combo)]}
				{#if row}
					<div class="variant" role="group" aria-labelledby="variant-{i}">
						<h3 id="variant-{i}">{combo.join(' / ') || t.only}</h3>
						<div class="variant-fields">
							<NumberField
								label={t.price}
								bind:value={row.price}
								min={0}
								step={10}
								format={money}
								error={fields[`variants.${i}.price`]}
							/>
							<NumberField
								label={t.compareAt}
								bind:value={row.compare}
								min={0}
								step={10}
								format={money}
								hint={i === 0 ? t.compareAtHint : undefined}
								error={fields[`variants.${i}.compare_at_price`]}
							/>
							<Input
								label={t.sku}
								bind:value={row.sku}
								maxlength={64}
								error={fields[`variants.${i}.sku`]}
							/>
							{#if row.id}
								<div class="stock">
									<span class="label">{t.stock}</span>
									<span class="count">{stockOf(row.id)}</span>
									<Button
										variant="secondary"
										size="sm"
										onclick={() => {
											adjusting = { id: row.id!, label: combo.join(' / ') || f.name };
											adjustOpen = true;
										}}>{t.adjust}</Button
									>
								</div>
							{:else}
								<NumberField label={t.startingStock} bind:value={row.stock} min={0} />
							{/if}
							{#if fields[`variants.${i}.options`]}<p class="error">
									{fields[`variants.${i}.options`]}
								</p>{/if}
						</div>
					</div>
				{/if}
			{/each}
		</div>
	</Card>

	<div class="actions">
		{#if data.product}
			<ConfirmButton confirm={t.deleteConfirm} onconfirm={remove}>{t.delete}</ConfirmButton>
		{/if}
		<Button type="submit" loading={saving}>{t.save}</Button>
	</div>
</form>

<Dialog
	bind:open={adjustOpen}
	title={t.adjustTitle}
	description={adjusting ? `${adjusting.label} · ${t.adjustDescription}` : t.adjustDescription}
>
	{#if adjusting}
		<form
			method="POST"
			action="?/adjust"
			class="fields"
			use:enhance={() =>
				async ({ result, update }) => {
					await update({ reset: false, invalidateAll: false });
					if (result.type === 'success') {
						adjustOpen = false;
						toast.success(t.adjusted);
						await invalidateAll();
					}
				}}
		>
			<input type="hidden" name="variant" value={adjusting.id} />
			{#if form && 'adjustError' in form && form.adjustError}<Alert
					tone="danger"
					title={form.adjustError}
					live
				/>{/if}
			<NumberField
				label={t.delta}
				name="delta"
				value={1}
				min={-100000}
				max={100000}
				hint={t.deltaHint}
			/>
			<Select label={t.reason} name="reason" value="received">
				{#each Object.entries(t.reasons) as [value, label] (value)}<option {value}>{label}</option
					>{/each}
			</Select>
			<Input label={t.note} name="note" maxlength={200} />
			<Button type="submit">{t.adjustSave}</Button>
		</form>
	{/if}
</Dialog>

<style>
	.back {
		display: inline-block;
		margin-block-end: 0.75rem;
		font-size: 0.875rem;
	}
	.head {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		margin-block-end: 1.5rem;
	}
	h1 {
		margin: 0;
		font-size: 1.5rem;
	}
	form {
		display: grid;
		gap: 1rem;
	}
	.fields {
		display: grid;
		gap: 1rem;
	}
	.hint {
		margin: 0;
		color: var(--ui-muted);
		font-size: 0.875rem;
	}
	.error {
		grid-column: 1 / -1;
		margin: 0;
		color: var(--ui-danger);
		font-size: 0.875rem;
	}
	.option {
		display: grid;
		grid-template-columns: minmax(0, 12rem) minmax(0, 1fr) auto;
		align-items: start;
		gap: 0.75rem;
	}
	:global(.images) {
		--sortable-columns: 5;
	}
	.image {
		position: relative;
		aspect-ratio: 1;
	}
	.drag {
		display: block;
		inline-size: 100%;
		block-size: 100%;
		padding: 0;
		border: 0;
		border-radius: calc(var(--ui-radius) * 0.75);
		overflow: hidden;
		background: var(--ui-subtle);
		cursor: grab;
		touch-action: none;
	}
	.drag img {
		inline-size: 100%;
		block-size: 100%;
		object-fit: cover;
	}
	.main {
		position: absolute;
		inset-block-end: 0.25rem;
		inset-inline-start: 0.25rem;
		padding: 0.125rem 0.375rem;
		border-radius: 999px;
		background: var(--ui-surface-overlay);
		color: var(--ui-fg);
		font-size: 0.75rem;
	}
	.remove {
		position: absolute;
		inset-block-start: 0.25rem;
		inset-inline-end: 0.25rem;
		display: grid;
		place-items: center;
		inline-size: 1.75rem;
		block-size: 1.75rem;
		padding: 0;
		border: 0;
		border-radius: 999px;
		background: var(--ui-surface-overlay);
		color: var(--ui-fg);
		cursor: pointer;
	}
	.variants {
		display: grid;
		gap: 1rem;
	}
	.variant {
		margin: 0;
		padding: 1rem;
		border: 0;
		border-radius: var(--ui-radius);
		background: var(--ui-subtle);
	}
	.variant h3 {
		margin: 0;
		font-size: 0.9375rem;
	}
	.variant-fields {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(9rem, 1fr));
		align-items: start;
		gap: 0.75rem;
		margin-block-start: 0.5rem;
	}
	.stock {
		display: grid;
		grid-template-columns: auto auto;
		align-items: center;
		justify-content: start;
		gap: 0.25rem 0.75rem;
	}
	.stock .label {
		grid-column: 1 / -1;
		font-size: 0.875rem;
		font-weight: 500;
	}
	.count {
		font-family: var(--ui-font-mono);
		font-size: 1.125rem;
	}
	.actions {
		display: flex;
		justify-content: end;
		gap: 0.5rem;
	}
	@media (max-width: 40rem) {
		.option {
			grid-template-columns: 1fr;
		}
		:global(.images) {
			--sortable-columns: 3;
		}
	}
</style>
