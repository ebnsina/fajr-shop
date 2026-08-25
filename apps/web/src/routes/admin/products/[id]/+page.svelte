<script lang="ts">
	import { page } from '$app/state';
	import { superForm } from 'sveltekit-superforms';
	import { buildMatrix } from '$lib/variants';

	let { data } = $props();

	// superForm re-syncs on navigation itself, so reading data.form once here is intended.
	// svelte-ignore state_referenced_locally
	const { form, errors, enhance, submitting, message } = superForm(data.form, {
		dataType: 'json', // options and variants are nested arrays
		resetForm: false
	});

	let showPicker = $state(false);

	/** The matrix is derived from options, but merchant-entered rows survive it. */
	function regenerate() {
		$form.variants = buildMatrix($form.options, $form.variants);
	}

	const addOption = () => {
		$form.options = [...$form.options, { name: '', values: [{ value: '', swatchHex: null }] }];
	};
	const removeOption = (i: number) => {
		$form.options = $form.options.filter((_, n) => n !== i);
		regenerate();
	};
	const addValue = (i: number) => {
		$form.options[i]!.values = [...$form.options[i]!.values, { value: '', swatchHex: null }];
		$form.options = $form.options;
	};
	const removeValue = (oi: number, vi: number) => {
		$form.options[oi]!.values = $form.options[oi]!.values.filter((_, n) => n !== vi);
		$form.options = $form.options;
		regenerate();
	};

	const toggleImage = (id: string) => {
		$form.mediaIds = $form.mediaIds.includes(id)
			? $form.mediaIds.filter((m) => m !== id)
			: [...$form.mediaIds, id];
	};

	const picked = $derived(
		$form.mediaIds.map((id) => data.media.find((m) => m.id === id)).filter(Boolean)
	);

	const field =
		'field';
	const cell = 'field !px-2 !py-1 tabular-nums';
</script>

<svelte:head><title>{data.isNew ? 'New product' : $form.title} · {page.data.storeName ?? 'Fajr Shop'}</title></svelte:head>

<form method="POST" action="?/save" use:enhance class="pb-16">
	<div class="flex flex-wrap items-center justify-between gap-4">
		<div>
			<a href="/admin/products" class="text-sm text-muted hover:text-strong">← Products</a>
			<h1 class="mt-1 text-xl font-semibold tracking-tight">
				{data.isNew ? 'New product' : $form.title || 'Untitled'}
			</h1>
		</div>

		<div class="flex items-center gap-3">
			<select bind:value={$form.status} class="field">
				<option value="draft">Draft</option>
				<option value="active">Active</option>
				<option value="archived">Archived</option>
			</select>
			<button
				disabled={$submitting}
				class="btn btn-primary disabled:opacity-60"
			>
				{$submitting ? 'Saving…' : 'Save'}
			</button>
		</div>
	</div>

	{#if $message}
		<p class="mt-4 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">{$message}</p>
	{/if}

	<div class="mt-6 grid gap-6 lg:grid-cols-3">
		<!-- main column -->
		<div class="space-y-6 lg:col-span-2">
			<section class="space-y-4 card">
				<label class="block">
					<span class="mb-1 block text-sm font-medium text-body">Title</span>
					<input bind:value={$form.title} class={field} />
					{#if $errors.title}<p class="mt-1 text-xs text-red-600">{$errors.title}</p>{/if}
				</label>

				<label class="block">
					<span class="mb-1 block text-sm font-medium text-body">Short description</span>
					<input bind:value={$form.summary} placeholder="One line for cards and search results" class={field} />
				</label>

				<label class="block">
					<span class="mb-1 block text-sm font-medium text-body">Description</span>
					<textarea bind:value={$form.description} rows="8" class={field}></textarea>
				</label>
			</section>

			<!-- images -->
			<section class="card">
				<div class="flex items-center justify-between">
					<h2 class="text-sm font-medium text-body">Images</h2>
					<button type="button" onclick={() => (showPicker = !showPicker)} class="text-sm text-primary-600 hover:underline">
						{showPicker ? 'Done' : 'Choose images'}
					</button>
				</div>

				{#if picked.length}
					<ul class="mt-4 flex flex-wrap gap-3">
						{#each picked as item (item!.id)}
							<li class="relative">
								<img src={item!.url} alt={item!.alt ?? ''} class="size-20 rounded-lg border border-line object-cover" />
								<button
									type="button"
									onclick={() => toggleImage(item!.id)}
									aria-label="Remove image"
									class="absolute -end-2 -top-2 grid size-5 place-items-center rounded-full bg-neutral-900 text-xs text-white"
								>×</button>
							</li>
						{/each}
					</ul>
				{:else}
					<p class="mt-3 text-sm text-muted">No images yet. The first one is the card image.</p>
				{/if}

				{#if showPicker}
					<ul class="mt-4 grid max-h-72 grid-cols-4 gap-2 overflow-y-auto rounded-lg border border-line p-2 sm:grid-cols-6">
						{#each data.media as item (item.id)}
							{@const selected = $form.mediaIds.includes(item.id)}
							<li>
								<button
									type="button"
									onclick={() => toggleImage(item.id)}
									class="block w-full overflow-hidden rounded border-2 transition {selected ? 'border-brand-600' : 'border-transparent hover:border-line'}"
								>
									<img src={item.url} alt={item.alt ?? ''} class="aspect-square w-full object-cover" />
								</button>
							</li>
						{/each}
					</ul>
				{/if}
			</section>

			<!-- options -->
			<section class="card">
				<div class="flex items-center justify-between">
					<div>
						<h2 class="text-sm font-medium text-body">Options</h2>
						<p class="text-xs text-muted">Size, colour — anything the customer picks.</p>
					</div>
					{#if $form.options.length < 3}
						<button type="button" onclick={addOption} class="text-sm text-primary-600 hover:underline">Add option</button>
					{/if}
				</div>

				{#each $form.options as option, oi (oi)}
					<div class="mt-4 rounded-lg border border-line p-4">
						<div class="flex gap-2">
							<input
								bind:value={option.name}
								onblur={regenerate}
								placeholder="Option name, e.g. Size"
								class={field}
							/>
							<button type="button" onclick={() => removeOption(oi)} class="px-2 text-sm text-muted hover:text-red-600">
								Remove
							</button>
						</div>

						<div class="mt-3 space-y-2">
							{#each option.values as value, vi (vi)}
								<div class="flex items-center gap-2">
									<input bind:value={value.value} onblur={regenerate} placeholder="Value" class={field} />
									<input
										type="color"
										value={value.swatchHex ?? '#cccccc'}
										oninput={(e) => (value.swatchHex = e.currentTarget.value)}
										title="Swatch colour, for colour options"
										class="size-9 shrink-0 cursor-pointer rounded border border-line"
									/>
									<button type="button" onclick={() => removeValue(oi, vi)} class="px-1 text-faint hover:text-red-600">×</button>
								</div>
							{/each}
							<button type="button" onclick={() => addValue(oi)} class="text-xs text-primary-600 hover:underline">
								Add value
							</button>
						</div>
					</div>
				{/each}
			</section>

			{#if data.attributes.length}
				<section class="card">
					<h2 class="text-sm font-medium text-body">Specifications</h2>
					<p class="hint mt-1">
						Defined on the category. These become the spec table and the filters.
					</p>

					<div class="mt-3 grid gap-3 sm:grid-cols-2">
						{#each data.attributes as a (a.id)}
							<div>
								<label class="label" for="spec-{a.id}">
									{a.name}{#if a.unit}<span class="font-normal text-muted"> ({a.unit})</span>{/if}
								</label>
								<input id="spec-{a.id}" name="spec.{a.id}" value={data.specValues[a.id] ?? ''} class="field" />
							</div>
						{/each}
					</div>
				</section>
			{/if}

			<!-- variants -->
			<section class="card">
				<h2 class="text-sm font-medium text-body">
					{$form.options.length ? 'Variants' : 'Price and stock'}
				</h2>
				{#if $errors.variants?._errors}
					<p class="mt-1 text-xs text-red-600">{$errors.variants._errors}</p>
				{/if}

				<div class="mt-3 overflow-x-auto">
					<table class="w-full text-sm">
						<thead class="text-xs uppercase tracking-wide text-muted">
							<tr>
								{#if $form.options.length}<th class="py-2 text-start font-medium">Variant</th>{/if}
								<th class="py-2 text-start font-medium">SKU</th>
								<th class="py-2 text-end font-medium">Price ৳</th>
								<th class="py-2 text-end font-medium">Compare ৳</th>
								<th class="py-2 text-end font-medium">Cost ৳</th>
								<th class="py-2 text-end font-medium">Stock</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-line/50">
							{#each $form.variants as variant, i (variant.key || i)}
								<tr>
									{#if $form.options.length}
										<td class="py-2 pe-3 font-medium whitespace-nowrap">{variant.key}</td>
									{/if}
									<td class="py-2 pe-2"><input bind:value={variant.sku} class={cell} /></td>
									<td class="py-2 pe-2"><input type="number" step="0.01" min="0" bind:value={variant.price} class="{cell} text-end" /></td>
									<td class="py-2 pe-2"><input type="number" step="0.01" min="0" bind:value={variant.compareAt} class="{cell} text-end" /></td>
									<td class="py-2 pe-2"><input type="number" step="0.01" min="0" bind:value={variant.cost} class="{cell} text-end" /></td>
									<td class="py-2"><input type="number" min="0" bind:value={variant.stockOnHand} class="{cell} text-end" /></td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
				<p class="mt-3 text-xs text-muted">Cost is for your margin reports. Customers never see it.</p>
			</section>
		</div>

		<!-- sidebar -->
		<div class="space-y-6">
			<section class="space-y-4 card">
				<label class="block">
					<span class="mb-1 block text-sm font-medium text-body">Category</span>
					<select bind:value={$form.categoryId} class={field}>
						<option value={null}>No category</option>
						{#each data.categories as c (c.id)}<option value={c.id}>{c.label}</option>{/each}
					</select>
				</label>

				<label class="block">
					<span class="mb-1 block text-sm font-medium text-body">Brand</span>
					<select bind:value={$form.brandId} class={field}>
						<option value={null}>No brand</option>
						{#each data.brands as b (b.id)}<option value={b.id}>{b.name}</option>{/each}
					</select>
				</label>
			</section>

			<details class="card">
				<summary class="cursor-pointer text-sm font-medium text-body">Advanced</summary>

				<div class="mt-4 space-y-4">
					<label class="block">
						<span class="mb-1 block text-sm font-medium text-body">URL slug</span>
						<input bind:value={$form.slug} placeholder="Generated from the title" class={field} />
						<span class="mt-1 block text-xs text-muted">Changing this leaves a redirect behind, so old links keep working.</span>
					</label>

					<label class="block">
						<span class="mb-1 block text-sm font-medium text-body">Meta title</span>
						<input bind:value={$form.metaTitle} maxlength="70" class={field} />
					</label>

					<label class="block">
						<span class="mb-1 block text-sm font-medium text-body">Meta description</span>
						<textarea bind:value={$form.metaDescription} rows="3" maxlength="160" class={field}></textarea>
					</label>
				</div>
			</details>

			{#if !data.isNew}
				<button
					formaction="?/archive"
					class="w-full card !p-4 text-sm text-muted transition hover:border-red-200 hover:text-red-600"
				>
					Archive this product
				</button>
			{/if}
		</div>
	</div>
</form>
