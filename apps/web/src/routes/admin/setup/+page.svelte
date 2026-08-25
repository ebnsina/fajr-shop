<script lang="ts">
	import { page } from '$app/state';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import { Tick02FreeIcons } from '@hugeicons/core-free-icons';
	import { enhance } from '$app/forms';
	import { minorToTaka } from '@fajr/schemas';

	let { data, form } = $props();

	const STEPS = [
		{ key: 'store', label: 'Store' },
		{ key: 'theme', label: 'Look' },
		{ key: 'catalog', label: 'Products' },
		{ key: 'delivery', label: 'Delivery' },
		{ key: 'payments', label: 'Payments' },
		{ key: 'staff', label: 'Staff' }
	] as const;

	const index = $derived(STEPS.findIndex((s) => s.key === data.step));
	const inside = $derived(data.zones.find((z) => z.districts.includes('Dhaka')));
	const outside = $derived(data.zones.find((z) => z.districts.length === 0));
</script>

<svelte:head><title>Set up your shop · {page.data.storeName ?? 'Fajr Shop'}</title></svelte:head>

<div class="mx-auto max-w-2xl">
	<h1 class="text-xl font-semibold tracking-tight text-strong">Set up your shop</h1>
	<p class="mt-1 text-sm text-muted">
		Six steps, all skippable — everything here is editable in settings later.
	</p>

	<!-- progress -->
	<ol class="mt-6 flex flex-wrap gap-2" aria-label="Setup progress">
		{#each STEPS as s, i (s.key)}
			<li
				class="flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-xs
				       {i < index ? 'text-muted' : i === index ? 'bg-strong text-raised' : 'text-faint'}"
				aria-current={i === index ? 'step' : undefined}
			>
				{#if i < index}<HugeiconsIcon icon={Tick02FreeIcons} size={13} strokeWidth={2.5} aria-hidden="true" />{/if}
				{s.label}
			</li>
		{/each}
	</ol>

	{#if form?.error}
		<p class="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300" role="alert">
			{form.error}
		</p>
	{/if}

	{#if data.step === 'store'}
		<form method="POST" action="?/store" use:enhance class="card mt-6 !p-6 space-y-4">
			<h2 class="font-medium text-strong">What is the shop called?</h2>

			<div>
				<label class="label" for="storeName">Store name</label>
				<input id="storeName" name="storeName" value={data.settings.storeName} class="field" required />
			</div>

			<div>
				<label class="label" for="supportPhone">Support phone</label>
				<input id="supportPhone" name="supportPhone" value={data.settings.supportPhone ?? ''} placeholder="01XXXXXXXXX" class="field" />
				<p class="hint mt-1">Shown on the storefront and printed on invoices.</p>
			</div>

			<label class="flex items-center gap-2 text-sm">
				<input type="checkbox" name="vatRegistered" checked={data.settings.vatRegistered} />
				This shop is VAT registered
			</label>

			<div>
				<label class="label" for="vatBin">BIN <span class="font-normal text-muted">(only if registered)</span></label>
				<input id="vatBin" name="vatBin" value={data.settings.vatBin ?? ''} class="field" />
			</div>

			<button class="btn btn-primary w-full">Continue</button>
		</form>

	{:else if data.step === 'theme'}
		<form method="POST" action="?/theme" use:enhance class="card mt-6 !p-6 space-y-4">
			<h2 class="font-medium text-strong">How should the storefront look?</h2>
			<p class="hint">Both are the same shop. You can switch any time.</p>

			<div class="grid gap-3 sm:grid-cols-2">
				{#each [['fashion', 'Fashion', 'Large imagery, roomy grid, colour swatches. Clothing, jewellery, home.'], ['tech', 'Tech', 'Dense grid, prices and stock up front, spec tables. Electronics, tools.']] as [value, title, body] (value)}
					<label class="cursor-pointer rounded-2xl bg-hover p-4 has-[:checked]:ring-2 has-[:checked]:ring-primary-500">
						<span class="flex items-center gap-2">
							<input type="radio" name="theme" {value} checked={data.settings.theme === value} />
							<strong class="text-sm text-strong">{title}</strong>
						</span>
						<span class="mt-2 block text-xs text-muted">{body}</span>
					</label>
				{/each}
			</div>

			<button class="btn btn-primary w-full">Continue</button>
		</form>

	{:else if data.step === 'catalog'}
		<form method="POST" action="?/catalog" use:enhance class="card mt-6 !p-6 space-y-4">
			<h2 class="font-medium text-strong">Where do your products come from?</h2>

			<div class="grid gap-3 sm:grid-cols-2">
				<label class="cursor-pointer rounded-2xl bg-hover p-4 has-[:checked]:ring-2 has-[:checked]:ring-primary-500">
					<span class="flex items-center gap-2">
						<input type="radio" name="choice" value="fresh" checked />
						<strong class="text-sm text-strong">Start fresh</strong>
					</span>
					<span class="mt-2 block text-xs text-muted">Add products by hand, one at a time.</span>
				</label>

				<label class="cursor-pointer rounded-2xl bg-hover p-4 has-[:checked]:ring-2 has-[:checked]:ring-primary-500">
					<span class="flex items-center gap-2">
						<input type="radio" name="choice" value="import" />
						<strong class="text-sm text-strong">Import a file</strong>
					</span>
					<span class="mt-2 block text-xs text-muted">
						From Shopify, WooCommerce or any CSV. Old URLs keep working.
					</span>
				</label>
			</div>

			<button class="btn btn-primary w-full">Continue</button>
		</form>

	{:else if data.step === 'delivery'}
		<form method="POST" action="?/delivery" use:enhance class="card mt-6 !p-6 space-y-4">
			<h2 class="font-medium text-strong">What do you charge for delivery?</h2>
			<input type="hidden" name="insideId" value={inside?.id ?? ''} />
			<input type="hidden" name="outsideId" value={outside?.id ?? ''} />

			<div class="grid gap-4 sm:grid-cols-2">
				<div>
					<label class="label" for="inside">Inside Dhaka ({page.data.currency ?? "BDT"})</label>
					<input id="inside" name="inside" type="number" step="1" min="0" value={inside ? Number(minorToTaka(inside.chargeMinor)) : 60} class="field" />
				</div>
				<div>
					<label class="label" for="outside">Outside Dhaka ({page.data.currency ?? "BDT"})</label>
					<input id="outside" name="outside" type="number" step="1" min="0" value={outside ? Number(minorToTaka(outside.chargeMinor)) : 120} class="field" />
				</div>
			</div>

			<div>
				<label class="label" for="freeOver">Free delivery over ({page.data.currency ?? 'BDT'}) <span class="font-normal text-muted">(optional)</span></label>
				<input id="freeOver" name="freeOver" type="number" step="1" min="0" value={inside?.freeOverMinor ? Number(minorToTaka(inside.freeOverMinor)) : ''} class="field" />
			</div>

			<p class="hint">
				The delivery charge is also collected as the COD advance. Taking it up front
				is what cuts fake orders.
			</p>

			<button class="btn btn-primary w-full">Continue</button>
		</form>

	{:else if data.step === 'payments'}
		<form method="POST" action="?/payments" use:enhance class="card mt-6 !p-6 space-y-4">
			<h2 class="font-medium text-strong">How will you take money?</h2>

			<ul class="space-y-2 text-sm">
				<li class="rounded-xl bg-hover p-3">
					<strong class="text-strong">Cash on delivery</strong> — on, and it is how most BD orders arrive.
				</li>
				<li class="rounded-xl bg-hover p-3">
					<strong class="text-strong">bKash, entered by hand</strong> — the customer sends money and
					types the transaction ID; staff confirm it before dispatch. No integration needed.
				</li>
				<li class="rounded-xl bg-hover p-3 text-muted">
					<strong class="text-strong">Online gateway</strong> — add SSLCommerz in settings once your
					merchant account is approved. Approval takes one to two weeks, so apply now.
				</li>
			</ul>

			<button class="btn btn-primary w-full">Continue</button>
		</form>

	{:else if data.step === 'staff'}
		<form method="POST" action="?/staff" use:enhance class="card mt-6 !p-6 space-y-4">
			<h2 class="font-medium text-strong">Anyone else using the admin?</h2>
			<p class="hint">Optional — you can add staff later.</p>

			<div class="grid gap-4 sm:grid-cols-2">
				<div>
					<label class="label" for="name">Their name</label>
					<input id="name" name="name" class="field" />
				</div>
				<div>
					<label class="label" for="roleId">Role</label>
					<select id="roleId" name="roleId" class="field">
						{#each data.roles as r (r.id)}<option value={r.id}>{r.name}</option>{/each}
					</select>
				</div>
			</div>

			<div>
				<label class="label" for="email">Their email</label>
				<input id="email" name="email" type="email" class="field" />
			</div>

			<div>
				<label class="label" for="password">A password for them</label>
				<input id="password" name="password" type="password" minlength="8" class="field" />
				<p class="hint mt-1">At least 8 characters. Ask them to change it when they sign in.</p>
			</div>

			<button class="btn btn-primary w-full">Finish setup</button>
		</form>
	{/if}

	{#if data.step !== 'staff'}
		<form method="POST" action="?/skip" use:enhance class="mt-3 text-center">
			<input type="hidden" name="step" value={data.step} />
			<button class="btn btn-ghost !text-xs">Skip this step</button>
		</form>
	{/if}
</div>
