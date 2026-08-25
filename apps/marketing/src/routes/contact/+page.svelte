<script lang="ts">
	import { enhance } from '$app/forms';
	import { MessageCircle, Phone, Mail } from '@lucide/svelte';
	import Arrow from '$lib/Arrow.svelte';
	import { PLANS, CONTACT } from '$lib/content';

	let { data, form } = $props();
	let busy = $state(false);

	// WhatsApp first: it is the channel this market actually answers.
	const CHANNELS = [
		{
			href: `https://wa.me/${CONTACT.whatsapp}`,
			icon: MessageCircle,
			label: 'WhatsApp',
			value: 'Usually answered within the hour',
			brand: true
		},
		{ href: `tel:${CONTACT.phone}`, icon: Phone, label: 'Call', value: CONTACT.phone },
		{ href: `mailto:${CONTACT.email}`, icon: Mail, label: 'Email', value: CONTACT.email }
	];

	// Every field's message, gathered under the sentence — an error hanging off
	// an inline input would push the words around as you type.
	const problems = $derived(Object.values(form?.errors ?? {}) as string[]);
</script>

<section class="sec">
	<div class="wrap grid gap-x-16 gap-y-12 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
		<div>
			<p class="eyebrow mb-6">Talk to us</p>
			<h1 class="display" style="font-size: var(--text-section)">Twenty minutes, on your numbers</h1>
			<p class="mt-6 leading-relaxed text-body" style="font-size: var(--text-lead)">
				Tell us your monthly orders and roughly what comes back. We will show you
				the same screens your staff would use, and be honest if this is not worth
				it for you yet.
			</p>

			<!-- Three ways to reach a person, as links rather than three boxes. -->
			<ul class="mt-10 space-y-4 border-t border-line pt-8">
				{#each CHANNELS as c (c.label)}
					<li class="flex items-start gap-3">
						<c.icon
							size={17}
							aria-hidden="true"
							class="mt-1 shrink-0 {c.brand ? 'text-[var(--color-whatsapp-ink)]' : 'text-faint'}"
						/>
						<span>
							<a
								href={c.href}
								class="link font-medium {c.brand ? '!text-[var(--color-whatsapp-ink)]' : ''}"
							>
								{c.label} <Arrow />
							</a>
							<span class="chrome block">{c.value}</span>
						</span>
					</li>
				{/each}
			</ul>
		</div>

		<div>
			{#if form?.sent}
				<div class="tile !p-8">
					<h2 class="tile-title text-xl">Got it</h2>
					<p class="mt-2 leading-relaxed text-muted">
						We will call the number you gave us, usually the same day. If it is
						urgent, WhatsApp is faster.
					</p>
					<a href="https://wa.me/{CONTACT.whatsapp}" class="btn btn-whatsapp mt-6 self-start">
						Message on WhatsApp
					</a>
				</div>
			{:else}
				<!--
				  The enquiry as one sentence: the same six answers a stack of boxes
				  asks for, in the shape a person would actually say them.
				-->
				<form
					method="POST"
					use:enhance={() => {
						busy = true;
						return async ({ update }) => {
							await update();
							busy = false;
						};
					}}
					class="tile !p-[clamp(1.5rem,3vw,2.5rem)]"
				>
					<p class="eyebrow mb-6 self-start">Or leave your number</p>

					<p class="sentence">
						I run
						<label class="sr-only" for="shop">Shop name</label><input
							id="shop"
							name="shop"
							class="inline-field"
							style="inline-size: 14ch"
							placeholder="shop name"
							value={form?.shop ?? ''}
						/>, taking about
						<label class="sr-only" for="orders">Orders a month</label><input
							id="orders"
							name="orders"
							inputmode="numeric"
							class="inline-field"
							style="inline-size: 6ch"
							placeholder="400"
							value={form?.orders ?? ''}
						/>
						orders a month, and I am looking at
						<label class="sr-only" for="plan">Plan you are looking at</label><select
							id="plan"
							name="plan"
							class="inline-field"
							value={data.plan ?? ''}
						>
							<option value="">a plan you can suggest</option>
							{#each PLANS as p (p.id)}<option value={p.id}>{p.name}</option>{/each}
						</select>.
						Call me on
						<label class="sr-only" for="phone">Phone</label><input
							id="phone"
							name="phone"
							type="tel"
							inputmode="numeric"
							required
							class="inline-field"
							style="inline-size: 14ch"
							placeholder="01XXXXXXXXX"
							value={form?.phone ?? ''}
							aria-invalid={form?.errors?.phone ? 'true' : undefined}
						/>
						— my name is
						<label class="sr-only" for="name">Your name</label><input
							id="name"
							name="name"
							required
							class="inline-field"
							style="inline-size: 13ch"
							placeholder="your name"
							value={form?.name ?? ''}
							aria-invalid={form?.errors?.name ? 'true' : undefined}
						/>.
					</p>

					{#if problems.length}
						<ul class="mt-5 space-y-1" role="alert">
							{#each problems as problem (problem)}
								<li class="chrome !text-warn-ink">{problem}</li>
							{/each}
						</ul>
					{/if}

					<div class="mt-8 border-t border-line pt-6">
						<label class="chrome" for="message">Anything else? (optional)</label>
						<textarea id="message" name="message" rows="2" class="field mt-2">{form?.message ?? ''}</textarea>
					</div>

					<!-- Honeypot: hidden from people, irresistible to bots. -->
					<div class="hidden" aria-hidden="true">
						<label for="company">Company</label>
						<input id="company" name="company" tabindex="-1" autocomplete="off" />
					</div>

					<div class="mt-6 flex flex-wrap items-center justify-between gap-4">
						<p class="chrome max-w-[38ch]">
							We use your number to call you about this enquiry. Nothing else, and
							we do not sell it.
						</p>
						<button disabled={busy} class="btn btn-primary">
							{busy ? 'Sending…' : 'Send'}
						</button>
					</div>
				</form>
			{/if}
		</div>
	</div>
</section>
