<script lang="ts">
	import { enhance } from '$app/forms';
	import * as v from 'valibot';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import {
		SquareLock01FreeIcons, CheckmarkCircle02FreeIcons,
		StoreLocation01FreeIcons, UserSettings01FreeIcons, WhatsappFreeIcons
	} from '@hugeicons/core-free-icons';
	import { kycSchema, fieldErrors, ORDER_BANDS } from '$lib/kyc';
	import { CONTACT } from '$lib/content';

	let { data, form } = $props();

	let busy = $state(false);
	// Client-side errors are a courtesy; the server validates the same schema.
	let clientErrors = $state<Record<string, string>>({});

	const errors = $derived({ ...clientErrors, ...(form?.errors ?? {}) });

	// Bound, not one-way: with value={...} any re-render — including the one that
	// renders a validation error — resets the input and wipes what was typed.
	let values = $state({ name: '', phone: '', shop: '', orders: '', selling: '' });

	// Re-seed from whatever the server echoed back after a failed submit.
	$effect(() => {
		if (!form || form.credentials) return;
		values = {
			name: form.name ?? '',
			phone: form.phone ?? '',
			shop: form.shop ?? '',
			orders: form.orders ?? '',
			selling: form.selling ?? ''
		};
	});

	// Declared with literal keys so reading form?.[id] stays type-safe.
	const FIELDS = [
		{ id: 'name', label: 'Your name', type: 'text', hint: '' },
		{ id: 'phone', label: 'Phone', type: 'tel', hint: 'So we can call if you get stuck' },
		{ id: 'shop', label: 'Shop or page name', type: 'text', hint: '' }
	] as const;

	function validate() {
		const parsed = v.safeParse(kycSchema, values);
		clientErrors = parsed.success ? {} : fieldErrors(parsed.issues);
		return parsed.success;
	}
</script>

<section class="mx-auto max-w-5xl px-6 py-16">
	{#if form?.credentials}
		{@const c = form.credentials}
		<div class="mx-auto max-w-2xl">
			<span class="grid size-12 place-items-center rounded-2xl bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300">
				<HugeiconsIcon icon={CheckmarkCircle02FreeIcons} size={24} aria-hidden="true" />
			</span>
			<h1 class="display mt-4 text-2xl font-semibold tracking-tight text-strong">
				You are in — {data.demo.shop}
			</h1>
			<p class="mt-2 text-muted">
				Open the storefront first and place an order, then log into the admin and
				watch it arrive.
			</p>

			<dl class="mt-8 space-y-4">
				<div class="card">
					<dt class="flex items-center gap-2 text-sm font-medium text-strong">
						<HugeiconsIcon icon={StoreLocation01FreeIcons} size={16} aria-hidden="true" />
						Storefront
					</dt>
					<dd class="mt-2">
						<a href={c.storefront} class="break-all font-mono text-sm text-primary-700 underline dark:text-primary-300">
							{c.storefront}
						</a>
					</dd>
				</div>

				<div class="card">
					<dt class="flex items-center gap-2 text-sm font-medium text-strong">
						<HugeiconsIcon icon={UserSettings01FreeIcons} size={16} aria-hidden="true" />
						Admin
					</dt>
					<dd class="mt-2 space-y-2">
						<a href={c.admin} class="block break-all font-mono text-sm text-primary-700 underline dark:text-primary-300">
							{c.admin}
						</a>
						<p class="font-mono text-sm text-body">
							<span class="text-faint">email</span>&nbsp; {c.email}
						</p>
						<p class="font-mono text-sm text-body">
							<span class="text-faint">password</span>&nbsp; {c.password}
						</p>
					</dd>
				</div>
			</dl>

			<p class="mt-6 text-sm text-muted">
				{c.sharedNote} Change anything you like — place orders, edit prices, break
				it. It is a demo, not your shop.
			</p>

			<a href="https://wa.me/{CONTACT.whatsapp}" class="btn btn-secondary mt-8 inline-flex items-center gap-2">
				<HugeiconsIcon icon={WhatsappFreeIcons} size={16} aria-hidden="true" />
				Ask a question while you look
			</a>
		</div>
	{:else}
		<div class="grid gap-10 lg:grid-cols-2">
			<div>
				<p class="eyebrow">{data.demo.label}</p>
				<h1 class="display mt-3 text-3xl font-semibold tracking-tight text-strong sm:text-4xl">
					{data.demo.shop}
				</h1>
				<p class="mt-5 text-lg text-muted">{data.demo.tagline}</p>

				<ul class="mt-6 space-y-2 text-muted">
					{#each data.demo.shows as item (item)}
						<li class="flex gap-2.5">
							<HugeiconsIcon
								icon={CheckmarkCircle02FreeIcons}
								size={18}
								aria-hidden="true"
								class="mt-0.5 shrink-0 text-primary-600 dark:text-primary-400"
							/>
							{item}
						</li>
					{/each}
				</ul>

				<p class="mt-8 text-sm text-faint">
					{data.demo.products} products · {data.demo.theme}
				</p>
			</div>

			<div>
				<form
					method="POST"
					onsubmit={(e) => {
						if (!validate()) e.preventDefault();
					}}
					use:enhance={() => {
						busy = true;
						return async ({ update }) => {
							await update({ reset: false });
							busy = false;
						};
					}}
					class="card space-y-4"
				>
					<div class="flex items-center gap-2">
						<HugeiconsIcon icon={SquareLock01FreeIcons} size={18} aria-hidden="true" class="text-muted" />
						<h2 class="display font-semibold text-strong">Five details, then the login</h2>
					</div>
					<p class="text-sm text-muted">
						We ask so we can follow up usefully, not to sell you anything on a
						timer. No card, no signup.
					</p>

					{#if errors.form}
						<p class="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300" role="alert">
							{errors.form}
						</p>
					{/if}

					{#each FIELDS as f (f.id)}
						<div>
							<label class="mb-1.5 block text-sm font-medium text-body" for={f.id}>{f.label}</label>
							<input
								id={f.id}
								name={f.id}
								type={f.type}
								inputmode={f.id === 'phone' ? 'numeric' : undefined}
								placeholder={f.id === 'phone' ? '01XXXXXXXXX' : undefined}
								bind:value={values[f.id]}
								aria-invalid={errors[f.id] ? 'true' : undefined}
								aria-describedby={errors[f.id] ? `${f.id}-error` : undefined}
								class="field"
							/>
							{#if errors[f.id]}
								<p id="{f.id}-error" class="mt-1.5 text-sm text-red-700 dark:text-red-300" role="alert">
									{errors[f.id]}
								</p>
							{:else if f.hint}
								<p class="mt-1.5 text-xs text-faint">{f.hint}</p>
							{/if}
						</div>
					{/each}

					<div>
						<label class="mb-1.5 block text-sm font-medium text-body" for="orders">Orders a month</label>
						<select
							id="orders"
							name="orders"
							bind:value={values.orders}
							aria-invalid={errors.orders ? 'true' : undefined}
							aria-describedby={errors.orders ? 'orders-error' : undefined}
							class="field"
						>
							<option value="">Pick one</option>
							{#each ORDER_BANDS as band (band.value)}
								<option value={band.value}>{band.label}</option>
							{/each}
						</select>
						{#if errors.orders}
							<p id="orders-error" class="mt-1.5 text-sm text-red-700 dark:text-red-300" role="alert">
								{errors.orders}
							</p>
						{/if}
					</div>

					<div>
						<label class="mb-1.5 block text-sm font-medium text-body" for="selling">
							What do you sell? <span class="font-normal text-faint">(optional)</span>
						</label>
						<input id="selling" name="selling" bind:value={values.selling} class="field" />
					</div>

					<!-- Honeypot: hidden from people, irresistible to bots. -->
					<div class="hidden" aria-hidden="true">
						<label for="company">Company</label>
						<input id="company" name="company" tabindex="-1" autocomplete="off" />
					</div>

					<button disabled={busy} class="btn btn-primary w-full">
						{busy ? 'Opening…' : 'Show me the login'}
					</button>

					<p class="text-xs text-faint">
						We use your number to follow up about this demo. Nothing else, and we
						do not sell it.
					</p>
				</form>
			</div>
		</div>
	{/if}
</section>
