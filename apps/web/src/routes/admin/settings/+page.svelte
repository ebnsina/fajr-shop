<script lang="ts">
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import { Delete02FreeIcons } from '@hugeicons/core-free-icons';
	import { enhance } from '$app/forms';
	import { minorToTaka, BD_DIVISIONS } from '@fajr/schemas';

	let { data, form } = $props();

	let editingZone = $state<string | null>(null);
	const s = $derived(data.settings);
</script>

<svelte:head><title>Settings · Fajr Shop</title></svelte:head>

<h1 class="text-xl font-semibold tracking-tight text-strong">Settings</h1>
<p class="mt-1 text-sm text-muted">Everything here is specific to this shop.</p>

{#if form?.error}
	<p class="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300" role="alert">
		{form.error}
	</p>
{:else if form?.saved}
	<p class="mt-4 rounded-xl bg-green-50 px-3 py-2 text-sm text-green-800 dark:bg-green-950/40 dark:text-green-300" role="status">
		Saved.
	</p>
{/if}

<div class="mt-6 grid gap-6 lg:grid-cols-2">
	<!-- store -->
	<form method="POST" action="?/store" use:enhance class="card !p-5 space-y-4">
		<h2 class="text-sm font-medium text-body">Store</h2>

		<div>
			<label class="label" for="storeName">Name</label>
			<input id="storeName" name="storeName" value={s.storeName} class="field" required />
		</div>

		<div class="grid gap-4 sm:grid-cols-2">
			<div>
				<label class="label" for="supportPhone">Support phone</label>
				<input id="supportPhone" name="supportPhone" value={s.supportPhone ?? ''} class="field" />
			</div>
			<div>
				<label class="label" for="supportEmail">Support email</label>
				<input id="supportEmail" name="supportEmail" type="email" value={s.supportEmail ?? ''} class="field" />
			</div>
		</div>

		<div class="grid gap-4 sm:grid-cols-2">
			<div>
				<label class="label" for="theme">Storefront theme</label>
				<select id="theme" name="theme" value={s.theme} class="field">
					<option value="fashion">Fashion — editorial, large imagery</option>
					<option value="tech">Tech — dense, spec-driven</option>
				</select>
			</div>
			<div>
				<label class="label" for="defaultLocale">Storefront language</label>
				<select id="defaultLocale" name="defaultLocale" value={s.defaultLocale} class="field">
					<option value="bn">বাংলা</option>
					<option value="en">English</option>
				</select>
			</div>
		</div>

		<div>
			<label class="label" for="logoMediaId">Logo</label>
			<select id="logoMediaId" name="logoMediaId" value={s.logoMediaId ?? ''} class="field">
				<option value="">No logo</option>
				{#each data.media as m (m.id)}<option value={m.id}>{m.alt ?? m.id}</option>{/each}
			</select>
		</div>

		<button class="btn btn-primary">Save store</button>
	</form>

	<!-- tax -->
	<form method="POST" action="?/tax" use:enhance class="card !p-5 space-y-4">
		<h2 class="text-sm font-medium text-body">VAT</h2>
		<p class="hint">
			Most BD shops are not registered. Leave this off and invoices print as a plain
			receipt with no tax line.
		</p>

		<label class="flex items-center gap-2 text-sm">
			<input type="checkbox" name="vatRegistered" checked={s.vatRegistered} />
			This shop is VAT registered
		</label>

		<div class="grid gap-4 sm:grid-cols-2">
			<div>
				<label class="label" for="vatBin">BIN</label>
				<input id="vatBin" name="vatBin" value={s.vatBin ?? ''} class="field" />
			</div>
			<div>
				<label class="label" for="vatRate">Rate %</label>
				<input id="vatRate" name="vatRate" type="number" step="0.01" min="0" value={s.vatRateBp / 100} class="field" />
			</div>
		</div>

		<label class="flex items-center gap-2 text-sm">
			<input type="checkbox" name="vatInclusivePricing" checked={s.vatInclusivePricing} />
			Prices already include VAT
		</label>

		<button class="btn btn-primary">Save VAT</button>
	</form>
</div>

<!-- delivery -->
<section class="card mt-6 !p-5">
	<div class="mb-3 flex items-center justify-between">
		<div>
			<h2 class="text-sm font-medium text-body">Delivery zones</h2>
			<p class="hint">First zone listing a district wins. A zone with no districts is the catch-all.</p>
		</div>
		<button class="btn btn-secondary !py-1 !text-xs" onclick={() => (editingZone = editingZone === 'new' ? null : 'new')}>
			Add zone
		</button>
	</div>

	<table class="w-full text-sm">
		<thead class="text-xs uppercase tracking-wide text-muted">
			<tr>
				<th class="pb-2 text-start font-medium">Zone</th>
				<th class="pb-2 text-start font-medium">Districts</th>
				<th class="pb-2 text-end font-medium">Charge</th>
				<th class="pb-2 text-end font-medium">Advance</th>
				<th class="pb-2 text-end font-medium">Free over</th>
				<th class="pb-2"></th>
			</tr>
		</thead>
		<tbody class="divide-y divide-line/50">
			{#each data.zones as z (z.id)}
				<tr class={z.isActive ? '' : 'opacity-50'}>
					<td class="py-2 font-medium">{z.name}</td>
					<td class="py-2 text-muted">{z.districts.length ? z.districts.join(', ') : 'Everywhere else'}</td>
					<td class="py-2 text-end font-mono tabular-nums">৳{minorToTaka(z.chargeMinor)}</td>
					<td class="py-2 text-end font-mono tabular-nums">৳{minorToTaka(z.advanceMinor)}</td>
					<td class="py-2 text-end font-mono tabular-nums text-muted">
						{z.freeOverMinor === null ? '—' : `৳${minorToTaka(z.freeOverMinor)}`}
					</td>
					<td class="py-2 text-end">
						<button class="btn btn-ghost !py-1 !text-xs" onclick={() => (editingZone = editingZone === z.id ? null : z.id)}>
							Edit
						</button>
						<form method="POST" action="?/deleteZone" use:enhance class="inline">
							<input type="hidden" name="id" value={z.id} />
							<button class="btn btn-ghost !px-2 hover:!text-red-600" aria-label="Delete {z.name}">
								<HugeiconsIcon icon={Delete02FreeIcons} size={15} strokeWidth={1.75} aria-hidden="true" />
							</button>
						</form>
					</td>
				</tr>
			{/each}
		</tbody>
	</table>

	{#if editingZone}
		{@const z = data.zones.find((x) => x.id === editingZone)}
		<form method="POST" action="?/zone" use:enhance class="mt-4 space-y-3 rounded-xl bg-hover p-4">
			{#if z}<input type="hidden" name="id" value={z.id} />{/if}

			<div class="grid gap-3 sm:grid-cols-2">
				<div>
					<label class="label" for="zname">Zone name</label>
					<input id="zname" name="name" value={z?.name ?? ''} class="field" required />
				</div>
				<div>
					<label class="label" for="zsort">Order</label>
					<input id="zsort" name="sort" type="number" value={z?.sort ?? data.zones.length} class="field" />
				</div>
			</div>

			<div>
				<label class="label" for="zdistricts">Districts</label>
				<input
					id="zdistricts"
					name="districts"
					value={z?.districts.join(', ') ?? ''}
					placeholder="Dhaka, Gazipur — or leave empty for everywhere else"
					class="field"
					list="bd-districts"
				/>
				<datalist id="bd-districts">
					{#each BD_DIVISIONS as div (div)}
						{#each data.districts[div] ?? [] as d (d)}<option value={d}></option>{/each}
					{/each}
				</datalist>
			</div>

			<div class="grid gap-3 sm:grid-cols-3">
				<div>
					<label class="label" for="zcharge">Delivery charge ৳</label>
					<input id="zcharge" name="charge" type="number" step="0.01" min="0" value={z ? Number(minorToTaka(z.chargeMinor)) : 60} class="field" />
				</div>
				<div>
					<label class="label" for="zadvance">COD advance ৳</label>
					<input id="zadvance" name="advance" type="number" step="0.01" min="0" value={z ? Number(minorToTaka(z.advanceMinor)) : 60} class="field" />
					<p class="hint mt-1">Collected up front. Cuts fake orders sharply.</p>
				</div>
				<div>
					<label class="label" for="zfree">Free over ৳</label>
					<input id="zfree" name="freeOver" type="number" step="0.01" min="0" value={z?.freeOverMinor ? Number(minorToTaka(z.freeOverMinor)) : ''} class="field" />
				</div>
			</div>

			<label class="flex items-center gap-2 text-sm">
				<input type="checkbox" name="isActive" checked={z ? z.isActive : true} />
				Active
			</label>

			<button class="btn btn-primary">Save zone</button>
		</form>
	{/if}
</section>
