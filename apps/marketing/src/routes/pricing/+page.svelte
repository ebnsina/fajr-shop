<script lang="ts">
	import { CircleCheck } from '@lucide/svelte';
	import Arrow from '$lib/Arrow.svelte';
	import { PLANS, OVERAGES, PRICING_FAQ, ROADMAP, CONTACT } from '$lib/content';

	const taka = (n: number) => new Intl.NumberFormat('en-US').format(n);
</script>

<section class="sec !pb-[clamp(40px,7vh,80px)]">
	<div class="wrap">
		<p class="eyebrow mb-6">Pricing</p>
		<h1 class="display max-w-[20ch]" style="font-size: var(--text-section)">
			Priced on what it costs to run your shop well
		</h1>
		<p class="mt-7 max-w-[58ch] leading-relaxed text-body" style="font-size: var(--text-lead)">
			Not on a percentage of your sales, and not on how many products you list.
			The real cost of running a shop is the support behind it, so that is what
			the monthly fee covers.
		</p>
	</div>
</section>

<!-- plans -->
<section class="wrap">
	<div class="grid gap-4 lg:grid-cols-3">
		{#each PLANS as plan (plan.id)}
			<div
				class="tile !gap-0 {plan.featured ? '!border-[var(--color-primary-600)]' : ''}"
				aria-labelledby="plan-{plan.id}"
			>
				<div class="flex items-baseline justify-between gap-3">
					<h2 id="plan-{plan.id}" class="tile-title">{plan.name}</h2>
					{#if plan.featured}<span class="badge-soon">Most shops</span>{/if}
				</div>

				<p class="tile-body mt-1">{plan.tagline}</p>

				<p class="mt-6">
					<span class="display num text-[2rem]">৳{taka(plan.monthlyBdt)}</span>
					<span class="chrome">/month</span>
				</p>
				<p class="chrome mt-1">plus ৳{taka(plan.setupBdt)} one-off setup</p>

				<dl class="mt-6 space-y-2 border-y border-line py-5">
					{#each [['Orders', plan.orders], ['SMS', plan.sms], ['Staff', plan.staff], ['Support', plan.support]] as [label, value] (label)}
						<div class="flex justify-between gap-4">
							<dt class="chrome">{label}</dt>
							<dd class="text-end text-[0.9375rem] text-body">{value}</dd>
						</div>
					{/each}
				</dl>

				<ul class="mt-5 flex-1 space-y-2.5">
					{#each plan.includes as line (line)}
						<li class="check !text-[0.875rem]">
							<CircleCheck size={16} aria-hidden="true" />
							{line}
						</li>
					{/each}
				</ul>

				<a
					href="/contact?plan={plan.id}"
					class="btn mt-8 w-full {plan.featured ? 'btn-primary' : 'btn-secondary'}"
				>
					Talk to us
				</a>
			</div>
		{/each}
	</div>

	<p class="chrome mt-6 max-w-[80ch]">
		Prices in Bangladeshi taka; the Gulf is quoted in dirhams at the equivalent
		tier. Excluding VAT where applicable. Changing plans takes effect the
		following month, and nobody is upgraded automatically for having a good
		month.
	</p>
</section>

<!-- what is metered, and why -->
<section class="sec">
	<div class="wrap grid gap-x-16 gap-y-8 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] lg:items-start">
		<div>
			<h2 class="display text-[clamp(1.375rem,2.4vw,1.875rem)]">
				Costs that scale with use are billed with use
			</h2>
			<p class="mt-4 leading-relaxed text-muted">
				SMS and fraud lookups cost us money per order, so they are metered rather
				than hidden in a bigger flat fee. A quiet month is genuinely cheaper.
			</p>
		</div>

		<dl class="grid sm:grid-cols-3">
			{#each OVERAGES as item (item.label)}
				<div class="border-t border-line py-4 sm:border-t-0 sm:border-s sm:px-5 sm:first:border-s-0 sm:first:ps-0">
					<dt class="chrome">{item.label}</dt>
					<dd class="num mt-1.5 text-[0.9375rem] text-strong">{item.price}</dd>
				</div>
			{/each}
		</dl>
	</div>
</section>

<!-- not included yet -->
<section class="sec !pt-0">
	<div class="wrap">
		<div class="flex flex-wrap items-baseline gap-3">
			<h2 class="display text-[clamp(1.375rem,2.4vw,1.875rem)]">Not included yet</h2>
			<span class="badge-soon">Coming soon</span>
		</div>
		<p class="mt-4 max-w-[60ch] leading-relaxed text-muted">
			These are being built. They are not part of any plan today, and we will
			tell you what they cost before they are — not add them to your bill.
		</p>

		<ul class="mt-6 flex flex-wrap gap-2">
			{#each ROADMAP as item (item.title)}
				<li class="chrome rounded-[var(--radius-control)] border border-line px-3 py-1.5">
					{item.title} <span class="!text-faint">· {item.when}</span>
				</li>
			{/each}
		</ul>
	</div>
</section>

<!-- questions -->
<section class="sec border-y border-line bg-sunken">
	<div class="wrap max-w-[52rem]">
		<p class="eyebrow mb-6">Asked often</p>
		<h2 class="display" style="font-size: var(--text-section)">Questions we get asked</h2>

		<div class="mt-12 border-t border-line">
			{#each PRICING_FAQ as item (item.q)}
				<details class="group border-b border-line py-5">
					<summary class="flex cursor-pointer list-none items-baseline justify-between gap-4">
						<span class="tile-title">{item.q}</span>
						<span class="chrome shrink-0 group-open:hidden">Read</span>
						<span class="chrome hidden shrink-0 group-open:block">Hide</span>
					</summary>
					<p class="mt-3 max-w-[68ch] leading-relaxed text-muted">{item.a}</p>
				</details>
			{/each}
		</div>
	</div>
</section>

<!-- close -->
<section class="sec">
	<div class="wrap flex flex-col items-center gap-3 text-center">
		<h2 class="display text-[clamp(1.375rem,2.4vw,1.875rem)]">
			Still not sure which plan fits?
		</h2>
		<p class="max-w-[52ch] leading-relaxed text-muted">
			Tell us your monthly order count and we will say which one — including if
			the answer is the cheapest.
		</p>
		<div class="mt-4 flex flex-wrap justify-center gap-3">
			<a href="/contact" class="btn btn-primary">Book a demo</a>
			<a href="https://wa.me/{CONTACT.whatsapp}" class="btn btn-whatsapp">WhatsApp</a>
		</div>
		<a href="/demo" class="link mt-4">Or open a demo shop first <Arrow /></a>
	</div>
</section>
