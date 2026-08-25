<script lang="ts">
	import { enhance } from '$app/forms';
	import * as v from 'valibot';
	import { CircleCheck, Store, UserCog, MessageCircle } from '@lucide/svelte';
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

	function validate() {
		const parsed = v.safeParse(kycSchema, values);
		clientErrors = parsed.success ? {} : fieldErrors(parsed.issues);
		return parsed.success;
	}
</script>

<section class="sec">
	{#if form?.credentials}
		{@const c = form.credentials}
		<div class="wrap max-w-3xl">
			<span class="grid size-12 place-items-center rounded-[var(--radius-surface)] bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300">
				<CircleCheck size={24} aria-hidden="true" />
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
						<Store size={16} aria-hidden="true" />
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
						<UserCog size={16} aria-hidden="true" />
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
				<MessageCircle size={16} aria-hidden="true" />
				Ask a question while you look
			</a>
		</div>
	{:else}
		<div class="wrap grid gap-x-16 gap-y-12 lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)]">
			<div>
				<p class="eyebrow">{data.demo.label}</p>
				<h1 class="display mt-3 text-3xl font-semibold tracking-tight text-strong sm:text-4xl">
					{data.demo.shop}
				</h1>
				<p class="mt-5 text-lg text-muted">{data.demo.tagline}</p>

				<ul class="mt-6 space-y-2 text-muted">
					{#each data.demo.shows as item (item)}
						<li class="flex gap-2.5">
							<CircleCheck
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
				<!--
				  The gate as one sentence, the same as the contact form: the five
				  answers a merchant would say out loud, not five boxes to fill in.
				-->
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
					class="tile !p-[clamp(1.5rem,3vw,2.5rem)]"
				>
					<p class="eyebrow mb-5 self-start">Five details, then the login</p>
					<p class="chrome max-w-[46ch]">
						We ask so we can follow up usefully, not to sell you anything on a
						timer. No card, no signup.
					</p>

					<p class="sentence mt-6">
						I run
						<label class="sr-only" for="shop">Shop or page name</label><input
							id="shop"
							name="shop"
							class="inline-field"
							style="inline-size: 14ch"
							placeholder="shop name"
							bind:value={values.shop}
							aria-invalid={errors.shop ? 'true' : undefined}
						/>, selling
						<label class="sr-only" for="selling">What do you sell?</label><input
							id="selling"
							name="selling"
							class="inline-field"
							style="inline-size: 12ch"
							placeholder="sarees"
							bind:value={values.selling}
						/>, at about
						<label class="sr-only" for="orders">Orders a month</label><select
							id="orders"
							name="orders"
							class="inline-field"
							bind:value={values.orders}
							aria-invalid={errors.orders ? 'true' : undefined}
						>
							<option value="">pick a size</option>
							{#each ORDER_BANDS as band (band.value)}
								<option value={band.value}>{band.label}</option>
							{/each}
						</select>.
						Call me on
						<label class="sr-only" for="phone">Phone</label><input
							id="phone"
							name="phone"
							type="tel"
							inputmode="numeric"
							class="inline-field"
							style="inline-size: 14ch"
							placeholder="01XXXXXXXXX"
							bind:value={values.phone}
							aria-invalid={errors.phone ? 'true' : undefined}
						/>
						— my name is
						<label class="sr-only" for="name">Your name</label><input
							id="name"
							name="name"
							class="inline-field"
							style="inline-size: 13ch"
							placeholder="your name"
							bind:value={values.name}
							aria-invalid={errors.name ? 'true' : undefined}
						/>.
					</p>

					<!-- Gathered here rather than under each field: an error hanging off
					     an inline input pushes the words around as you type. -->
					{#if Object.values(errors).filter(Boolean).length}
						<ul class="mt-5 space-y-1" role="alert">
							{#each Object.values(errors).filter(Boolean) as problem (problem)}
								<li class="chrome !text-warn-ink">{problem}</li>
							{/each}
						</ul>
					{/if}

					<!-- Honeypot: hidden from people, irresistible to bots. -->
					<div class="hidden" aria-hidden="true">
						<label for="company">Company</label>
						<input id="company" name="company" tabindex="-1" autocomplete="off" />
					</div>

					<div class="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-6">
						<p class="chrome max-w-[38ch]">
							We use your number to follow up about this demo. Nothing else, and
							we do not sell it.
						</p>
						<button disabled={busy} class="btn btn-primary">
							{busy ? 'Opening…' : 'Open'}
						</button>
					</div>
				</form>
			</div>
		</div>
	{/if}
</section>
