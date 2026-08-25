<script lang="ts">
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import { Tick02FreeIcons } from '@hugeicons/core-free-icons';
	import { PLANS, OVERAGES, PRICING_FAQ, ROADMAP, CONTACT } from '$lib/content';

	const taka = (n: number) => new Intl.NumberFormat('en-US').format(n);
</script>


<section class="mx-auto max-w-6xl px-6 pb-12 pt-16">
	<p class="eyebrow">Pricing</p>
	<h1 class="display mt-3 max-w-3xl text-3xl font-semibold tracking-tight text-strong sm:text-4xl">
		Priced on what it costs to run your shop well
	</h1>
	<p class="mt-5 max-w-2xl text-lg text-muted">
		Not on a percentage of your sales, and not on how many products you list.
		The real cost of running a shop is the support behind it, so that is what
		the monthly fee covers.
	</p>
</section>

<!-- plans -->
<section class="mx-auto max-w-6xl px-6 pb-4">
	<div class="grid gap-5 lg:grid-cols-3">
		{#each PLANS as plan (plan.id)}
			<div
				class="card flex flex-col {plan.featured ? 'ring-2 ring-primary-600' : ''}"
				aria-labelledby="plan-{plan.id}"
			>
				<div class="flex items-center justify-between gap-2">
					<h2 id="plan-{plan.id}" class="font-semibold text-strong">{plan.name}</h2>
					{#if plan.featured}
						<span class="rounded-full bg-primary-100 px-2 py-0.5 text-xs font-medium text-primary-900 dark:bg-primary-900/40 dark:text-primary-200">
							Most shops
						</span>
					{/if}
				</div>

				<p class="mt-1 text-sm text-muted">{plan.tagline}</p>

				<p class="mt-5">
					<span class="font-mono text-3xl tabular-nums text-strong">৳{taka(plan.monthlyBdt)}</span>
					<span class="text-sm text-muted">/month</span>
				</p>
				<p class="mt-1 text-sm text-muted">
					plus ৳{taka(plan.setupBdt)} one-off setup
				</p>

				<dl class="mt-5 space-y-1.5 border-y border-line py-4 text-sm">
					{#each [['Orders', plan.orders], ['SMS', plan.sms], ['Staff', plan.staff], ['Support', plan.support]] as [label, value] (label)}
						<div class="flex justify-between gap-4">
							<dt class="text-faint">{label}</dt>
							<dd class="text-end text-body">{value}</dd>
						</div>
					{/each}
				</dl>

				<ul class="mt-4 flex-1 space-y-2 text-sm">
					{#each plan.includes as line (line)}
						<li class="flex items-start gap-2">
							<HugeiconsIcon icon={Tick02FreeIcons} size={16} class="mt-0.5 shrink-0 text-primary-600" aria-hidden="true" />
							<span class="text-muted">{line}</span>
						</li>
					{/each}
				</ul>

				<a
					href="/contact?plan={plan.id}"
					class="btn mt-6 w-full {plan.featured ? 'btn-primary' : 'btn-secondary'}"
				>
					Talk to us
				</a>
			</div>
		{/each}
	</div>

	<p class="mt-5 text-sm text-muted">
		Prices in Bangladeshi taka for South Asia; Gulf pricing is quoted in dirhams
		at the equivalent tier. Excluding VAT where applicable. Changing plans
		takes effect the following month, and nobody is upgraded automatically for
		having a good month.
	</p>
</section>

<!-- overages -->
<section class="mx-auto max-w-6xl px-6 py-14">
	<div class="card">
		<h2 class="display font-semibold text-strong">Costs that scale with use are billed with use</h2>
		<p class="mt-2 max-w-2xl text-sm text-muted">
			SMS and fraud lookups cost us money per order, so they are metered rather
			than hidden in a bigger flat fee. A quiet month is genuinely cheaper.
		</p>

		<ul class="mt-5 grid gap-3 sm:grid-cols-3">
			{#each OVERAGES as item (item.label)}
				<li class="rounded-2xl bg-hover px-4 py-3">
					<p class="text-sm text-muted">{item.label}</p>
					<p class="mt-1 font-mono text-sm text-strong">{item.price}</p>
				</li>
			{/each}
		</ul>
	</div>
</section>

<!-- roadmap note -->
<section class="mx-auto max-w-6xl px-6 pb-14">
	<div class="card">
		<div class="flex flex-wrap items-center gap-3">
			<h2 class="display font-semibold text-strong">Not included yet</h2>
			<span class="badge-soon">Coming soon</span>
		</div>
		<p class="mt-2 max-w-2xl text-sm text-muted">
			These are being built. They are not part of any plan today, and we will
			tell you what they cost before they are — not add them to your bill.
		</p>

		<ul class="mt-4 flex flex-wrap gap-2">
			{#each ROADMAP as item (item.title)}
				<li class="rounded-full bg-hover px-3 py-1.5 text-sm text-muted">
					{item.title}
					<span class="ms-1 text-xs text-faint">· {item.when}</span>
				</li>
			{/each}
		</ul>
	</div>
</section>

<!-- faq -->
<section class="mx-auto max-w-3xl px-6 pb-16">
	<h2 class="display text-2xl font-semibold tracking-tight text-strong">Questions we get asked</h2>

	<div class="mt-6 divide-y divide-line">
		{#each PRICING_FAQ as item (item.q)}
			<details class="group py-4">
				<summary class="cursor-pointer list-none font-medium text-strong">
					{item.q}
				</summary>
				<p class="mt-3 text-sm leading-relaxed text-muted">{item.a}</p>
			</details>
		{/each}
	</div>

	<div class="mt-10 rounded-3xl bg-sunken p-6 text-center">
		<p class="text-strong">Still not sure which plan fits?</p>
		<p class="mt-1 text-sm text-muted">
			Tell us your monthly order count and we will say which one — including if
			the answer is the cheapest.
		</p>
		<div class="mt-4 flex flex-wrap justify-center gap-3">
			<a href="/contact" class="btn btn-primary">Book a demo</a>
			<a href="https://wa.me/{CONTACT.whatsapp}" class="btn btn-secondary">WhatsApp</a>
		</div>
	</div>
</section>
