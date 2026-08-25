<script lang="ts">
	import { enhance } from '$app/forms';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import { WhatsappFreeIcons, Call02FreeIcons, Mail01FreeIcons } from '@hugeicons/core-free-icons';
	import { PLANS, CONTACT } from '$lib/content';

	let { data, form } = $props();
	let busy = $state(false);
</script>


<section class="mx-auto max-w-5xl px-6 py-16">
	<div class="grid gap-10 lg:grid-cols-2">
		<div>
			<p class="eyebrow">Talk to us</p>
			<h1 class="mt-3 text-3xl font-semibold tracking-tight text-strong sm:text-4xl">
				Twenty minutes, on your numbers
			</h1>
			<p class="mt-5 text-lg text-muted">
				Tell us your monthly orders and roughly what comes back. We will show you
				the same screens your staff would use, and be honest if this is not worth
				it for you yet.
			</p>

			<!-- WhatsApp first: it is the channel this market actually answers. -->
			<ul class="mt-8 space-y-3">
				{#each [
					{ href: `https://wa.me/${CONTACT.whatsapp}`, icon: WhatsappFreeIcons, label: 'WhatsApp', value: 'Fastest — usually within the hour' },
					{ href: `tel:${CONTACT.phone}`, icon: Call02FreeIcons, label: 'Phone', value: CONTACT.phone },
					{ href: `mailto:${CONTACT.email}`, icon: Mail01FreeIcons, label: 'Email', value: CONTACT.email }
				] as item (item.label)}
					<li>
						<a href={item.href} class="card flex items-center gap-4 !py-4 transition hover:shadow-lg">
							<span class="grid size-10 shrink-0 place-items-center rounded-xl bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">
								<HugeiconsIcon icon={item.icon} size={18} aria-hidden="true" />
							</span>
							<span>
								<span class="block font-medium text-strong">{item.label}</span>
								<span class="block text-sm text-muted">{item.value}</span>
							</span>
						</a>
					</li>
				{/each}
			</ul>
		</div>

		<div>
			{#if form?.sent}
				<div class="card">
					<h2 class="font-semibold text-strong">Got it</h2>
					<p class="mt-2 text-muted">
						We will call the number you gave us, usually the same day. If it is
						urgent, WhatsApp is faster.
					</p>
					<a href="https://wa.me/{CONTACT.whatsapp}" class="btn btn-secondary mt-5">Message on WhatsApp</a>
				</div>
			{:else}
				<form
					method="POST"
					use:enhance={() => {
						busy = true;
						return async ({ update }) => {
							await update();
							busy = false;
						};
					}}
					class="card space-y-4"
				>
					<h2 class="font-semibold text-strong">Or leave your number</h2>

					{#if form?.errors?.form}
						<p class="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300" role="alert">
							{form.errors.form}
						</p>
					{/if}

					<div>
						<label class="mb-1.5 block text-sm font-medium text-body" for="name">Your name</label>
						<input
							id="name"
							name="name"
							required
							value={form?.name ?? ''}
							aria-invalid={form?.errors?.name ? 'true' : undefined}
							aria-describedby={form?.errors?.name ? 'name-error' : undefined}
							class="field"
						/>
						{#if form?.errors?.name}
							<p id="name-error" class="mt-1.5 text-sm text-red-700 dark:text-red-300" role="alert">
								{form.errors.name}
							</p>
						{/if}
					</div>

					<div>
						<label class="mb-1.5 block text-sm font-medium text-body" for="phone">Phone</label>
						<input
							id="phone"
							name="phone"
							type="tel"
							inputmode="numeric"
							placeholder="01XXXXXXXXX"
							required
							value={form?.phone ?? ''}
							aria-invalid={form?.errors?.phone ? 'true' : undefined}
							aria-describedby={form?.errors?.phone ? 'phone-error' : undefined}
							class="field"
						/>
						{#if form?.errors?.phone}
							<p id="phone-error" class="mt-1.5 text-sm text-red-700 dark:text-red-300" role="alert">
								{form.errors.phone}
							</p>
						{/if}
					</div>

					<div class="grid gap-4 sm:grid-cols-2">
						<div>
							<label class="mb-1.5 block text-sm font-medium text-body" for="shop">Shop name</label>
							<input id="shop" name="shop" value={form?.shop ?? ''} class="field" />
						</div>
						<div>
							<label class="mb-1.5 block text-sm font-medium text-body" for="orders">Orders a month</label>
							<input id="orders" name="orders" inputmode="numeric" placeholder="e.g. 400" value={form?.orders ?? ''} class="field" />
						</div>
					</div>

					<div>
						<label class="mb-1.5 block text-sm font-medium text-body" for="plan">Plan you are looking at</label>
						<select id="plan" name="plan" value={data.plan ?? ''} class="field">
							<option value="">Not sure yet</option>
							{#each PLANS as p (p.id)}<option value={p.id}>{p.name}</option>{/each}
						</select>
					</div>

					<div>
						<label class="mb-1.5 block text-sm font-medium text-body" for="message">Anything else</label>
						<textarea id="message" name="message" rows="3" class="field">{form?.message ?? ''}</textarea>
					</div>

					<!-- Honeypot: hidden from people, irresistible to bots. -->
					<div class="hidden" aria-hidden="true">
						<label for="company">Company</label>
						<input id="company" name="company" tabindex="-1" autocomplete="off" />
					</div>

					<button disabled={busy} class="btn btn-primary w-full">
						{busy ? 'Sending…' : 'Send'}
					</button>

					<p class="text-xs text-faint">
						We use your number to call you about this enquiry. Nothing else, and we
						do not sell it.
					</p>
				</form>
			{/if}
		</div>
	</div>
</section>
