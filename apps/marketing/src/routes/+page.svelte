<script lang="ts">
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import { ArrowRight01FreeIcons, Tick02FreeIcons } from '@hugeicons/core-free-icons';
	import { OPERATIONS, STOREFRONT, RUNNING, ROADMAP, PLANS, DEMOS, CONTACT } from '$lib/content';
	import { REGIONS, money, type RegionId } from '$lib/regions';

	const taka = (n: number) => new Intl.NumberFormat('en-US').format(n);
	const growth = PLANS.find((p) => p.featured)!;

	// One product, two very different markets. The visitor picks which one they
	// are, and the whole pitch above the fold changes with them.
	let regionId = $state<RegionId>('south-asia');
	const region = $derived(REGIONS.find((r) => r.id === regionId)!);

	const SECTIONS = [
		{ id: 'operations', eyebrow: 'Where the money leaks', title: 'The operational half nobody else builds', items: OPERATIONS },
		{ id: 'storefront', eyebrow: 'The shop itself', title: 'A storefront built for this market', items: STOREFRONT },
		{ id: 'running', eyebrow: 'Day to day', title: 'The work after the order', items: RUNNING }
	];
</script>


<!-- hero -->
<section class="mx-auto grid max-w-6xl gap-12 px-6 pb-16 pt-14 sm:pt-20 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
	<div>
	<div
		class="inline-flex rounded-2xl bg-sunken p-1"
		role="group"
		aria-label="Choose your region"
	>
		{#each REGIONS as r (r.id)}
			<button
				onclick={() => (regionId = r.id)}
				aria-pressed={regionId === r.id}
				class="rounded-xl px-4 py-2 text-sm font-medium transition
				       {regionId === r.id ? 'bg-raised text-strong elevation-1' : 'text-muted hover:text-strong'}"
			>
				{r.label}
			</button>
		{/each}
	</div>

	<p class="eyebrow mt-6">{region.eyebrow}</p>
	<h1 class="display mt-4 max-w-3xl text-4xl font-semibold leading-[1.1] tracking-tight text-strong sm:text-5xl">
		{region.headline.lead}
		<!-- Its own line: the two halves are a pair, and reflowing them mid-phrase
		     loses the turn the sentence is built on. -->
		<span class="mt-1 block text-muted">{region.headline.trail}</span>
	</h1>

	<p class="mt-6 max-w-2xl text-lg text-muted">{region.pitch}</p>

	<div class="mt-8 flex flex-wrap gap-3">
		<a href="/demo" class="btn btn-primary">
			Open a live demo <HugeiconsIcon icon={ArrowRight01FreeIcons} size={16} aria-hidden="true" />
		</a>
		<a href="/pricing" class="btn btn-secondary">See pricing</a>
	</div>

	<p class="mt-4 text-sm text-faint">
		From {money(region.priceFrom.amount, region.priceFrom.currency, region.locale)}/month.
		No revenue share, ever.
	</p>

	<!-- Naming the couriers and wallets a merchant already uses does more than any
	     feature list: it proves the product knows their market. -->
	<dl class="mt-10 grid gap-6 border-t border-line pt-8 sm:grid-cols-3">
		<div>
			<dt class="text-xs font-medium uppercase tracking-wide text-faint">Markets</dt>
			<dd class="mt-1.5 text-sm text-body">{region.markets.join(' · ')}</dd>
		</div>
		<div>
			<dt class="text-xs font-medium uppercase tracking-wide text-faint">Couriers</dt>
			<dd class="mt-1.5 text-sm text-body">{region.couriers.join(' · ')}</dd>
		</div>
		<div>
			<dt class="text-xs font-medium uppercase tracking-wide text-faint">Payments</dt>
			<dd class="mt-1.5 text-sm text-body">{region.payments.join(' · ')}</dd>
		</div>
	</dl>

	{#if region.status === 'building'}
		<p class="mt-6 flex flex-wrap items-center gap-2 text-sm text-muted">
			<span class="badge-soon">In build</span>
			{region.note}
		</p>
	{/if}
	</div>

	<!-- Showing the product beats describing it. This is the screen the pitch is
	     actually about: an order stopped before it was accepted. -->
	<div class="relative" aria-hidden="true">
		<div class="absolute -inset-6 rounded-[2rem] bg-gradient-to-br from-primary-500/20 via-primary-500/5 to-transparent blur-2xl"></div>

		<div class="relative rounded-3xl bg-raised p-5 elevation-2">
			<div class="flex items-center justify-between">
				<p class="text-xs font-medium uppercase tracking-wide text-faint">Incoming order</p>
				<span class="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-950/50 dark:text-red-300">
					High risk
				</span>
			</div>

			<p class="mt-3 font-mono text-lg text-strong">{region.id === 'middle-east' ? 'AED 690' : 'BDT 4,250'}</p>
			<p class="text-sm text-muted">{region.id === 'middle-east' ? '+971 50 •••  ••67' : '+880 17•• ••••78'}</p>

			<dl class="mt-4 space-y-2 border-t border-line pt-4 text-sm">
				<div class="flex justify-between gap-3">
					<dt class="text-muted">Delivered before</dt>
					<dd class="font-mono tabular-nums text-body">3</dd>
				</div>
				<div class="flex justify-between gap-3">
					<dt class="text-muted">Returned before</dt>
					<dd class="font-mono tabular-nums text-red-700 dark:text-red-400">9</dd>
				</div>
				<div class="flex justify-between gap-3">
					<dt class="text-muted">Risk score</dt>
					<dd class="font-mono tabular-nums text-body">74 / 100</dd>
				</div>
			</dl>

			<p class="mt-4 rounded-2xl bg-sunken p-3 text-sm text-body">
				<span class="font-medium text-strong">Ask for payment in advance.</span>
				Nine of this number's last twelve parcels came back.
			</p>
		</div>
	</div>
</section>

<!-- the problem, in numbers -->
<section class="reveal border-y border-line bg-sunken">
	<div class="mx-auto grid max-w-6xl gap-8 px-6 py-14 sm:grid-cols-3">
		{#each region.stats as stat (stat.figure)}
			<div>
				<p class="font-mono text-3xl tabular-nums text-strong">{stat.figure}</p>
				<p class="mt-2 text-sm text-muted">{stat.body}</p>
			</div>
		{/each}
	</div>
</section>

<!-- features -->
<div id="what-it-does">
	{#each SECTIONS as section (section.id)}
		<section class="reveal mx-auto max-w-6xl px-6 py-16">
			<p class="eyebrow">{section.eyebrow}</p>
			<h2 class="display mt-3 max-w-2xl text-2xl font-semibold tracking-tight text-strong sm:text-3xl">
				{section.title}
			</h2>

			<div class="mt-8 grid gap-4 sm:grid-cols-2">
				{#each section.items as item (item.title)}
					<div class="card">
						<h3 class="font-medium text-strong">{item.title}</h3>
						<p class="mt-2 text-sm leading-relaxed text-muted">{item.body}</p>
					</div>
				{/each}
			</div>
		</section>
	{/each}
</div>

<!-- live demos, one per trade -->
<section class="reveal mx-auto max-w-6xl px-6 py-16">
	<p class="eyebrow">See it working</p>
	<h2 class="display mt-3 text-2xl font-semibold tracking-tight text-strong sm:text-3xl">
		A demo shop for your trade, not someone else's
	</h2>
	<p class="mt-4 max-w-2xl text-muted">
		Six working storefronts with real catalogues and an admin you can log into.
		Place an order, cancel it, change a price — they reset every night.
	</p>

	<ul class="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
		{#each DEMOS as demo (demo.key)}
			<li>
				<a href="/demo/{demo.key}" class="card flex items-baseline justify-between gap-3 !py-4 transition hover:shadow-lg">
					<span>
						<span class="block font-medium text-strong">{demo.label}</span>
						<span class="block text-sm text-muted">{demo.shop}</span>
					</span>
					<span class="shrink-0 text-xs text-faint">{demo.products} products</span>
				</a>
			</li>
		{/each}
	</ul>

	<a href="/demo" class="btn btn-secondary mt-8">Compare all six</a>
</section>

<!-- roadmap -->
<section id="roadmap" class="border-y border-line bg-sunken">
	<div class="mx-auto max-w-6xl px-6 py-16">
		<p class="eyebrow">On the way</p>
		<h2 class="display mt-3 max-w-2xl text-2xl font-semibold tracking-tight text-strong sm:text-3xl">
			What we are building next
		</h2>
		<p class="mt-3 max-w-2xl text-muted">
			Listed so you can plan, not to pad the page. Nothing here is included in a
			price today, and we will tell you before it is.
		</p>

		<ul class="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{#each ROADMAP as item (item.title)}
				<li class="card">
					<div class="flex items-start justify-between gap-3">
						<h3 class="font-medium text-strong">{item.title}</h3>
						<span class="badge-soon">{item.when}</span>
					</div>
					<p class="mt-2 text-sm leading-relaxed text-muted">{item.body}</p>
				</li>
			{/each}
		</ul>
	</div>
</section>

<!-- pricing teaser -->
<section class="reveal mx-auto max-w-6xl px-6 py-16">
	<div class="card !p-8 lg:flex lg:items-center lg:gap-10">
		<div class="lg:flex-1">
			<p class="eyebrow">Pricing</p>
			<h2 class="display mt-3 text-2xl font-semibold tracking-tight text-strong">
				One flat fee. We never touch your revenue.
			</h2>
			<p class="mt-3 text-muted">
				Most shops land on <strong class="text-strong">{growth.name}</strong> —
				BDT {taka(growth.monthlyBdt)} a month plus a one-off setup, with couriers,
				payments, fraud checking and reconciliation included.
			</p>

			<ul class="mt-5 grid gap-2 text-sm sm:grid-cols-2">
				{#each growth.includes.slice(0, 6) as line (line)}
					<li class="flex items-start gap-2">
						<HugeiconsIcon icon={Tick02FreeIcons} size={16} class="mt-0.5 shrink-0 text-primary-600" aria-hidden="true" />
						<span class="text-muted">{line}</span>
					</li>
				{/each}
			</ul>
		</div>

		<div class="mt-8 shrink-0 lg:mt-0">
			<a href="/pricing" class="btn btn-primary w-full lg:w-auto">
				Compare plans <HugeiconsIcon icon={ArrowRight01FreeIcons} size={16} aria-hidden="true" />
			</a>
		</div>
	</div>
</section>

<!-- close -->
<section class="mx-auto max-w-6xl px-6 pb-8">
	<div class="rounded-3xl bg-primary-600 p-8 text-white sm:p-12">
		<h2 class="display max-w-2xl text-2xl font-semibold tracking-tight sm:text-3xl">
			Show us your return rate. We will show you ours.
		</h2>
		<p class="mt-3 max-w-2xl text-primary-100">
			Twenty minutes on a call, on your own numbers. If we cannot see a way to
			cut what you lose to returns, we will say so.
		</p>
		<div class="mt-6 flex flex-wrap gap-3">
			<a href="/contact" class="btn !bg-white !text-primary-700 hover:!bg-primary-50">Book a demo</a>
			<a href="https://wa.me/{CONTACT.whatsapp}" class="btn !border !border-white/30 !bg-transparent !text-white hover:!bg-white/10">
				Message on WhatsApp
			</a>
		</div>
	</div>
</section>
