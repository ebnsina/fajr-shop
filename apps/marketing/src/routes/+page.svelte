<script lang="ts">
	import { enhance } from '$app/forms';
	import Arrow from '$lib/Arrow.svelte';
	import {
		ArrowRight, Search, Bell, Plus, ChevronDown, LayoutDashboard, Package,
		Users, Truck, ChartNoAxesColumn, Settings, Phone, CircleCheck, ShoppingBag,
		Shirt, Baby, ShoppingBasket, Laptop, Sparkles, Sofa, MessageCircle, X
	} from '@lucide/svelte';
	import {
		OPERATIONS, STOREFRONT, RUNNING, ROADMAP, PLANS, DEMOS, CONTACT, STORY, CLOSE, WHERE
	} from '$lib/content';
	import { REGIONS, MARKETS, money, regionById, type Market } from '$lib/regions';
	import Globe from '$lib/Globe.svelte';

	// The feature request posts back here; `form` is what the action returned.
	let { form } = $props();
	let ask = $state<HTMLDialogElement>();

	// A failed submit re-renders with errors; the dialog has to come back with
	// them, or the visitor sees the page reset and their words gone.
	$effect(() => {
		if (form?.errors && ask && !ask.open) ask.showModal();
	});

	const taka = (n: number) => new Intl.NumberFormat('en-US').format(n);
	const growth = PLANS.find((p) => p.featured)!;

	// The story is told from one market's point of view rather than switched
	// between two: a toggle above the fold reflows the whole hero under the
	// reader's cursor, and the second market gets its own band further down.
	const home = REGIONS[0]!;

	// The pictures are the product's own screens, so the numbers in them are
	// the only place this page invents data. Kept together for that reason.
	const COURIERS = [
		{ name: 'Steadfast', rate: 94 },
		{ name: 'Pathao', rate: 81 },
		{ name: 'RedX', rate: 66 },
		{ name: 'eCourier', rate: 52 }
	];
	const QUEUE = [
		{ id: '4193', name: 'Rahima Akter', at: 'Mirpur 10', courier: 'Steadfast', amount: '4,250', risk: 74 },
		{ id: '4192', name: 'Shakib Hasan', at: 'Uttara 7', courier: 'Pathao', amount: '1,890', risk: 12 },
		{ id: '4191', name: 'Nusrat Jahan', at: 'Dhanmondi', courier: 'Steadfast', amount: '3,400', risk: 8 },
		{ id: '4190', name: 'Imran Kabir', at: 'Jatrabari', courier: 'RedX', amount: '990', risk: 71 },
		{ id: '4189', name: 'Tanvir Rahman', at: 'Bashundhara', courier: 'Pathao', amount: '2,150', risk: 24 }
	];

	const NAV = [
		{ label: 'Dashboard', icon: LayoutDashboard, sub: false },
		{ label: 'Orders', icon: Package, sub: true },
		{ label: 'Customers', icon: Users, sub: true },
		{ label: 'Couriers', icon: Truck, sub: true },
		{ label: 'Reports', icon: ChartNoAxesColumn, sub: false },
		{ label: 'Settings', icon: Settings, sub: true }
	];

	// The call queue down the right: who is waiting, and how long they have been.
	const CALLS = [
		{ who: 'Rahima Akter', id: '4193', when: 'just now', note: 'Nine of the last twelve parcels came back. Ask for bKash first.' },
		{ who: 'Imran Kabir', id: '4190', when: '12m', note: 'Third order this week to the same address, all cancelled.' },
		{ who: 'Sadia Noor', id: '4187', when: '1h', note: 'Number unreachable twice. One more try before we drop it.' }
	];

	const initials = (name: string) => name.split(' ').map((w) => w[0]).join('').slice(0, 2);
	// The four products on the storefront screen. Tones stand in for photography
	// we do not have — a grey box reads as a wireframe, a colour reads as a shop.
	const PRODUCTS = [
		{ name: 'Jamdani saree', price: '3,900', tone: '#dfe7f7', tag: 'New', swatches: ['#1e5ae8', '#b4762f', '#2f3b52'] },
		{ name: 'Cotton kurti', price: '1,850', tone: '#f2e7db', tag: '', swatches: ['#c98f4e', '#7a4d12'] },
		{ name: 'Silk panjabi', price: '2,400', tone: '#e4ecf6', tag: '', swatches: ['#2f3b52', '#1e5ae8'] },
		{ name: 'Half-silk saree', price: '990', tone: '#efe3ea', tag: 'Sale', swatches: ['#8e5570', '#c98f4e', '#2f3b52'] }
	];

	const MESSAGES = [
		{ from: 'shop', body: 'Order #4193 confirmed. We will call before delivery.' },
		{ from: 'shop', body: 'On the way with Steadfast. Track: fajr.shop/t/4193' },
		{ from: 'customer', body: 'ok bhai, ami bikale barite thakbo' },
		{ from: 'shop', body: 'Delivered. Thank you — reply RATE to tell us how it went.' }
	];

	const WALLS = [
		{ beat: 'operations', items: OPERATIONS },
		{ beat: 'storefront', items: STOREFRONT },
		{ beat: 'running', items: RUNNING }
	];

	// The globe and the market list share one selection, and the panel beside
	// them reads from it.
	let market = $state<Market>(MARKETS[0]!);
	const shown = $derived(regionById(market.region));

	// One icon per trade, so nine cards of similar text can be told apart at a
	// glance. Same mapping as the demo index.
	const TRADE = {
		fashion: Shirt, kids: Baby, grocery: ShoppingBasket, tech: Laptop,
		beauty: Sparkles, home: Sofa, 'gulf-fashion': Shirt, 'gulf-tech': Laptop,
		'gulf-grocery': ShoppingBasket
	} as Record<string, typeof Shirt>;

	// Tile one is wide and carries the screen; the last two split the row.
	const shape = (i: number) => (i === 0 ? 'tile-wide' : i >= 2 ? 'tile-tall' : '');
</script>

{#snippet bar(title: string)}
	<div class="screen-bar">
		<span class="screen-dot"></span>
		<span class="screen-dot"></span>
		<span class="screen-dot"></span>
		<span class="chrome ms-2">{title}</span>
	</div>
{/snippet}

<!-- the admin as it actually looks: a queue with one order stopped -->
{#snippet dashboard()}
	<div class="screen" aria-hidden="true">
		<div class="dash">
			<nav class="dash-rail">
				<div class="flex items-center gap-2 px-1 pb-3">
					<span class="grid size-6 place-items-center rounded-[var(--radius-control)] bg-[var(--color-primary-600)] text-[11px] font-semibold text-white">N</span>
					<span class="text-[0.8125rem] font-semibold text-strong">Neel Tanti</span>
					<ChevronDown size={13} class="ms-auto text-faint" />
				</div>

				<div class="dash-search mb-2">
					<Search size={13} />
					<span>Search orders…</span>
				</div>

				{#each NAV as item, i (item.label)}
					<span class="dash-item" data-on={i === 1}>
						<item.icon size={15} />
						{item.label}
						{#if item.sub}<ChevronDown size={13} class="ms-auto opacity-50" />{/if}
					</span>
				{/each}
			</nav>

			<div>
				<div class="dash-head">
					<div>
						<p class="display text-lg">Good morning, Nasrin</p>
						<p class="chrome">Six orders are waiting on a decision before they ship.</p>
					</div>
					<div class="flex gap-1.5">
						<span class="dash-btn"><Bell size={14} /></span>
						<span class="dash-btn"><Plus size={14} /></span>
					</div>
				</div>

				<div class="dash-stats">
					{#each [['6', 'Needs review'], ['41', 'Out for delivery'], ['9', 'Returned this week']] as [n, label] (label)}
						<div class="dash-stat">
							<b class="num">{n}</b>
							<p class="chrome">{label}</p>
						</div>
					{/each}
				</div>

				<div class="flex items-center justify-between gap-4 px-4 py-2.5">
					<p class="text-[0.8125rem] font-semibold text-strong">Order queue</p>
					<span class="chrome">Sorted by risk</span>
				</div>

				{#each QUEUE as o (o.id)}
					<div class="dash-row" data-flagged={o.risk >= 70}>
						<span class="chrome num">#{o.id}</span>
						<span class="flex min-w-0 items-center gap-2">
							<span class="avatar">{initials(o.name)}</span>
							<span class="min-w-0">
								<span class="block truncate text-[0.8125rem] font-medium text-strong">{o.name}</span>
								<span class="chrome block truncate !text-xs">{o.at} · {o.courier}</span>
							</span>
						</span>
						<span class="chrome num text-end">BDT {o.amount}</span>
						<span class="justify-self-end">
							<span class="pill" data-tone={o.risk >= 70 ? 'risk' : 'ok'}>
								{o.risk >= 70 ? 'Prepay' : 'Ship'}
							</span>
						</span>
						<span class="chrome num text-end {o.risk >= 70 ? '!text-warn-ink' : ''}">{o.risk}</span>
					</div>
				{/each}
			</div>

			<aside class="dash-side">
				<div class="flex items-center justify-between gap-3 pb-1">
					<p class="text-[0.8125rem] font-semibold text-strong">Call queue</p>
					<span class="pill"><Phone size={11} /> <span class="num">3</span></span>
				</div>

				{#each CALLS as c (c.id)}
					<div class="feed-item">
						<span class="avatar">{initials(c.who)}</span>
						<span class="min-w-0">
							<span class="block text-[0.8125rem] text-strong">
								{c.who}
								<span class="chrome ms-1 !text-xs">#{c.id} · {c.when}</span>
							</span>
							<span class="chrome mt-0.5 block !text-xs leading-relaxed">{c.note}</span>
						</span>
					</div>
				{/each}

				<span class="btn btn-primary btn-compact mt-3 w-full">Open the queue</span>
			</aside>
		</div>
	</div>
{/snippet}

{#snippet courierScreen()}
	<div class="screen" aria-hidden="true">
		{@render bar('Courier performance — Mirpur 10')}
		<div class="screen-body space-y-2">
			{#each COURIERS as c (c.name)}
				<div class="flex items-center gap-3">
					<span class="meter">
						<span style="inline-size: {c.rate}%"></span>
						<b>{c.name}</b>
					</span>
					<span class="chrome num text-strong">{c.rate}%</span>
				</div>
			{/each}
			<p class="chrome !mt-4">Delivered on the first attempt, counted from your own parcels.</p>
		</div>
	</div>
{/snippet}

{#snippet checkoutScreen()}
	<!-- A Fold, open: the phone this market aspires to, and the one device where
	     a two-pane checkout is real rather than a layout trick. -->
	<div class="fold mx-auto" aria-hidden="true">
		<span class="fold-lens"></span>
		<div class="flex items-center justify-center border-b border-line bg-sunken py-2">
			<span class="chrome !text-[0.6875rem]">neeltanti.com/checkout</span>
		</div>

		<div class="fold-panes">
			<div class="space-y-2.5 p-3.5">
				<div class="flex items-baseline justify-between">
					<p class="display text-[0.9375rem]">Delivery</p>
					<span class="chrome !text-[0.625rem]">Step 1 of 1</span>
				</div>

				{#each [['Full name', 'Rahima Akter'], ['Mobile', '01712 345678'], ['Address', 'House 12, Road 4, Mirpur 10']] as [label, value] (label)}
					<div>
						<span class="chrome !text-[0.625rem]">{label}</span>
						<p class="field mt-1 truncate !py-1.5 !text-[0.75rem] !text-strong">{value}</p>
					</div>
				{/each}
			</div>

			<div class="flex flex-col gap-2.5 p-3.5">
				<div class="rounded-[var(--radius-control)] border border-[var(--color-primary-600)] bg-[var(--color-primary-50)] p-2.5">
					<span class="flex items-center gap-1.5 text-[0.75rem] font-medium text-[var(--color-primary-800)]">
						<CircleCheck size={14} /> Cash on delivery
					</span>
					<span class="chrome mt-1 block !text-[0.625rem]">Pay the rider when it arrives</span>
				</div>

				<dl class="space-y-1">
					{#each [['Saree × 1', 'BDT 3,900'], ['Delivery', 'BDT 350']] as [k, v] (k)}
						<div class="flex justify-between gap-2">
							<dt class="chrome !text-[0.625rem]">{k}</dt>
							<dd class="chrome num !text-[0.625rem]">{v}</dd>
						</div>
					{/each}
				</dl>

				<span class="btn btn-primary btn-compact mt-auto w-full !text-[0.6875rem]">Confirm · BDT 4,250</span>
				<p class="chrome text-center !text-[0.625rem]">No account needed</p>
			</div>
		</div>
	</div>
{/snippet}

{#snippet storefrontScreen()}
	<div class="screen" aria-hidden="true">
		{@render bar('neeltanti.com')}
		<div class="flex items-center justify-between gap-4 border-b border-line px-4 py-2.5">
			<div class="flex items-center gap-2">
				<span class="grid size-5 place-items-center rounded-[var(--radius-control)] bg-[var(--color-primary-600)] text-[9px] font-semibold text-white">N</span>
				<span class="text-[0.8125rem] font-semibold text-strong">Neel Tanti</span>
			</div>
			<div class="hidden gap-4 sm:flex">
				{#each ['Saree', 'Kurti', 'Panjabi', 'Sale'] as c, i (c)}
					<span class="chrome !text-[0.8125rem] {i === 0 ? '!text-strong' : ''}">{c}</span>
				{/each}
			</div>
			<span class="flex items-center gap-1.5">
				<Search size={14} class="text-faint" />
				<ShoppingBag size={14} class="text-faint" />
				<span class="pill" data-tone="ok"><span class="num">2</span></span>
			</span>
		</div>

		<div class="screen-body">
			<div class="flex items-baseline justify-between gap-4">
				<p class="display text-lg">New in saree</p>
				<span class="chrome"><span class="num">52</span> products · free delivery over BDT 2,000</span>
			</div>

			<div class="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
				{#each PRODUCTS as p (p.name)}
					<div>
						<div class="relative aspect-[16/9] rounded-[var(--radius-control)]" style="background: {p.tone}">
							{#if p.tag}
								<span class="pill absolute start-1.5 top-1.5 !bg-white !text-[0.6875rem]">{p.tag}</span>
							{/if}
						</div>
						<p class="mt-2 truncate text-[0.8125rem] font-medium text-strong">{p.name}</p>
						<p class="chrome num !text-[0.8125rem]">BDT {p.price}</p>
						<span class="mt-1.5 flex gap-1">
							{#each p.swatches as sw (sw)}
								<span class="size-2.5 rounded-[var(--radius-pill)] border border-line" style="background: {sw}"></span>
							{/each}
						</span>
					</div>
				{/each}
			</div>
		</div>
	</div>
{/snippet}

{#snippet smsScreen()}
	<div class="screen" aria-hidden="true">
		{@render bar('Order #4193 — messages')}
		<div class="screen-body space-y-2.5">
			{#each MESSAGES as m (m.body)}
				<p
					class="chrome max-w-[38ch] rounded-[var(--radius-control)] p-2.5 leading-relaxed
					       {m.from === 'shop'
						? 'bg-[var(--color-primary-50)] !text-[var(--color-primary-900)]'
						: 'ms-auto bg-sunken'}"
				>
					{m.body}
				</p>
			{/each}
		</div>
	</div>
{/snippet}

<!-- the shop, before a word of the pitch -->
<section class="sec-hero !block !pb-0">
	<div class="wrap enter flex flex-col items-center pt-[clamp(24px,7vh,72px)] text-center">
		<h1 class="display display-xl">
			<span class="mask-line"><span>{home.headline.lead}</span></span>
			<span class="mask-line"><span class="display-accent">{home.headline.trail}</span></span>
		</h1>

		<p
			class="mt-7 leading-relaxed text-body"
			style="font-size: var(--text-lead); max-inline-size: var(--measure-lead)"
		>
			{home.hook}
		</p>

		<div class="mt-8 flex flex-wrap justify-center gap-3">
			<a href="/demo" class="btn btn-primary">
				Explore a live demo <ArrowRight size={15} aria-hidden="true" />
			</a>
			<a href="/pricing" class="btn btn-secondary">See what it costs</a>
		</div>

		<p class="chrome mt-5">
			From <span class="num">{money(home.priceFrom.amount, home.priceFrom.currency, home.locale)}</span>
			a month. No revenue share, ever.
		</p>
	</div>

	<!-- The fold cuts the dashboard: what a merchant needs to see is the queue
	     with one order held back, and that is the top of it. -->
	<div class="stage mt-[clamp(32px,6vh,64px)] px-[var(--pad)] pb-[clamp(24px,5vh,56px)]">
		<div class="lift">
			{@render dashboard()}
		</div>
	</div>
</section>

<!-- the one place the geography is stated, and it gets the whole screen -->
<section class="sec-full border-b border-line bg-sunken">
	<div class="wrap flex flex-col items-center justify-center py-[clamp(32px,5vh,64px)] text-center">
		<h2 class="display max-w-[26ch]" style="font-size: var(--text-section)">
			<span class="mask-line"><span>{WHERE.headline[0]}</span></span>
			<span class="mask-line"><span class="display-accent">{WHERE.headline[1]}</span></span>
		</h2>

		<p class="mt-6 leading-relaxed text-body" style="font-size: var(--text-lead); max-inline-size: var(--measure-lead)">
			{WHERE.body}
		</p>

		<div class="mt-[clamp(20px,3.5vh,44px)]">
			<Globe bind:selected={market} />
		</div>

		<!-- One line, fed by whichever control the visitor reached for. -->
		<dl class="mt-7 flex flex-wrap items-baseline justify-center gap-x-8 gap-y-2">
			{#each [['Region', shown.label], ['Couriers', shown.couriers.join(', ')], ['Payments', shown.payments.join(', ')]] as [k, v] (k)}
				<div class="flex items-baseline gap-2">
					<dt class="chrome">{k}</dt>
					<dd class="text-[0.9375rem] text-strong">{v}</dd>
				</div>
			{/each}
		</dl>

		<!-- Whatever is not live yet says so, from its own status — nothing here
		     names a region the data does not. -->
		{#each REGIONS.filter((r) => r.status === 'building') as r (r.id)}
			<p class="chrome mt-5 flex flex-wrap items-center justify-center gap-2">
				<span class="badge-soon">{r.short} in build</span>
				{r.note}
			</p>
		{/each}
	</div>
</section>

<!-- the five chapters, dealt as a stack -->
<div id="what-it-does" class="sec">
	<div class="wrap stack">
		{#each STORY as b, i (b.id)}
			<article class="stack-card" style="--i: {i}; --done: {(i + 1) / STORY.length}">
				<!-- Chapter n of five, and how far through the story that is. -->
				<div class="flex items-center gap-4">
					<span class="stack-count"><b>{String(i + 1).padStart(2, '0')}</b> / {String(STORY.length).padStart(2, '0')}</span>
					<span class="stack-rail"></span>
					<span class="eyebrow !text-faint">{b.chapter}</span>
				</div>

				<div class="mt-6 grid gap-x-12 gap-y-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:items-end">
					<h2 class="display max-w-[22ch]" style="font-size: var(--text-section)">
						{#each b.title as line (line)}
							<span class="mask-line"><span>{line}</span></span>
						{/each}
					</h2>
					<p class="leading-relaxed text-body" style="font-size: var(--text-lead)">{b.body}</p>
				</div>

				{#if b.aside}
					<p class="display mt-7 max-w-[30ch] border-s-2 border-[var(--color-primary-600)] ps-5 text-[clamp(1.125rem,1.8vw,1.5rem)] !leading-[1.3]">
						{b.aside}
					</p>
				{/if}

				{#if b.id === 'returns'}
					<dl class="stagger mt-8 grid gap-8 sm:grid-cols-3">
						{#each home.stats as stat (stat.figure)}
							<div class="figure-block">
								<dt class="display text-[clamp(1.5rem,3vw,2.25rem)] tabular-nums">{stat.figure}</dt>
								<dd class="max-w-[34ch] text-[0.9375rem] leading-relaxed text-muted">{stat.body}</dd>
							</div>
						{/each}
					</dl>
				{:else if b.id === 'operations'}
					<div class="rise mt-6">{@render courierScreen()}</div>
				{:else if b.id === 'storefront'}
					<div class="rise mt-5">{@render storefrontScreen()}</div>
				{:else if b.id === 'running'}
					<div class="rise mt-6">{@render smsScreen()}</div>
				{/if}
			</article>
		{/each}
	</div>
</div>

<!--
  The index at the back of the book: everything the chapters named, numbered
  straight through, three columns of rules rather than twelve identical boxes.
  Cards here would be the fourth set of cards on one page — and a summary of a
  story you have just read wants to be quiet and dense, not loud again.
-->
<section class="sec border-t border-line bg-sunken">
	<div class="wrap stagger">
		<div class="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:items-end">
			<div>
				<p class="eyebrow mb-6">The index</p>
				<h2 class="display max-w-[20ch]" style="font-size: var(--text-section)">
					<span class="mask-line"><span>Everything the story</span></span>
					<span class="mask-line"><span class="display-accent">just walked you through</span></span>
				</h2>
			</div>
			<p class="leading-relaxed text-body" style="font-size: var(--text-lead)">
				Twelve things, in the order the story met them. Nothing here is on a
				roadmap — it is what a shop gets on the day it opens.
			</p>
		</div>

		<!-- Head then four rows, per column: `grid-auto-flow: column` puts them in
		     that order, and every row lines up across all three. -->
		<div class="index mt-14">
			{#each WALLS as wall, w (wall.beat)}
				{@const b = STORY.find((x) => x.id === wall.beat)!}
				<h3 class="index-head">{b.title.join(' ')}</h3>
				{#each wall.items as item, n (item.title)}
					<div class="index-row">
						<span class="index-num">{String(w * 4 + n + 1).padStart(2, '0')}</span>
						<span>
							<span class="index-title">{item.title}</span>
							<span class="index-body">{item.body}</span>
						</span>
					</div>
				{/each}
			{/each}
		</div>

		<!-- One of the twelve, as it actually looks. -->
		<figure class="mt-16 flex flex-col items-center">
			{@render checkoutScreen()}
			<figcaption class="chrome mt-5 text-center">
				Checkout, on the phone this market actually wants — three fields, one
				payment method, no account.
			</figcaption>
		</figure>
	</div>
</section>

<!-- see it working -->
<section class="sec border-t border-line bg-sunken">
	<div class="wrap stagger">
		<p class="eyebrow mb-6">Nine shops you can break</p>
		<h2 class="display max-w-[20ch]" style="font-size: var(--text-section)">
			<span class="mask-line"><span>Rather than take our word,</span></span>
			<span class="mask-line"><span class="display-accent">go and place an order</span></span>
		</h2>
		<p class="mt-8 max-w-[54ch] leading-relaxed text-body" style="font-size: var(--text-lead)">
			One demo shop per trade, each with a real catalogue and an admin you can log
			into. Place an order, cancel it, change a price. They reset every night, so
			nothing you do is precious.
		</p>

		<!-- Nine demos across a six-column wall: two spans each, three to a row,
		     so the last row is not one orphan tile. -->
		<ul class="bento stagger mt-12">
			{#each DEMOS as demo (demo.key)}
				{@const Icon = TRADE[demo.key]}
				<li class="cell">
					<a href="/demo/{demo.key}" class="tile w-full">
						<span class="grid size-9 place-items-center rounded-[var(--radius-control)] bg-[var(--color-primary-50)] text-[var(--color-primary-700)]">
							<Icon size={17} aria-hidden="true" />
						</span>
						<span class="tile-title mt-1">{demo.label}</span>
						<span class="tile-body">{demo.tagline}</span>
						<span class="chrome mt-auto pt-3">{demo.shop} · <span class="num">{demo.products}</span> products</span>
					</a>
				</li>
			{/each}
		</ul>

		<a href="/demo" class="btn btn-secondary mt-10">Compare all nine</a>
	</div>
</section>

<!-- what happens next -->
<section id="roadmap" class="sec">
	<div class="wrap">
		<p class="eyebrow mb-6">Where the story goes</p>
		<h2 class="display max-w-[18ch]" style="font-size: var(--text-section)">
			<span class="mask-line"><span>What we are</span></span>
			<span class="mask-line"><span class="display-accent">building next</span></span>
		</h2>
		<p class="mt-8 max-w-[54ch] leading-relaxed text-body" style="font-size: var(--text-lead)">
			Listed so you can plan, not to pad the page. Nothing here is included in a
			price today, and we will tell you before it is.
		</p>

		<div class="bento stagger mt-12">
			{#each ROADMAP as item (item.title)}
				<div class="tile tile-tall">
					<div class="flex items-baseline justify-between gap-3">
						<h3 class="tile-title">{item.title}</h3>
						<span class="badge-soon">{item.when}</span>
					</div>
					<p class="tile-body">{item.body}</p>
				</div>
			{/each}

		</div>

		<!--
		  Asking for something that is not on the list is the most useful thing a
		  merchant can tell us. Without JavaScript the link goes to the contact
		  page, which is a working way to say the same thing.
		-->
		<div class="mt-12 flex flex-col items-center gap-2 text-center">
			<p class="text-body">
				Do not see what you need? What merchants ask for twice is what gets
				built next.
			</p>
			<a
				href="/contact"
				class="link font-medium"
				onclick={(e) => {
					e.preventDefault();
					ask?.showModal();
				}}
			>
				Request a feature <Arrow />
			</a>
		</div>
	</div>
</section>

<!-- what it costs -->
<section class="sec border-y border-line bg-sunken">
	<div class="wrap stagger">
		<p class="eyebrow mb-6">What it costs</p>
		<h2 class="display max-w-[18ch]" style="font-size: var(--text-section)">
			<span class="mask-line"><span>One flat fee.</span></span>
			<span class="mask-line"><span class="display-accent">We never touch your revenue.</span></span>
		</h2>
		<p class="mt-8 max-w-[54ch] leading-relaxed text-body" style="font-size: var(--text-lead)">
			Most shops land on <span class="font-semibold text-strong">{growth.name}</span> —
			<span class="num">BDT {taka(growth.monthlyBdt)}</span> a month plus a one-off setup, with couriers, payments, fraud checking and
			reconciliation included.
		</p>

		<ul class="stagger mt-10 grid max-w-4xl gap-x-10 gap-y-3.5 sm:grid-cols-2">
			{#each growth.includes.slice(0, 6) as line (line)}
				<li class="check">
					<CircleCheck size={17} aria-hidden="true" />
					{line}
				</li>
			{/each}
		</ul>

		<a href="/pricing" class="btn btn-primary mt-10">
			Compare plans <ArrowRight size={15} aria-hidden="true" />
		</a>
	</div>
</section>

<!-- the feature request, in the platform's own dialog -->
<dialog bind:this={ask} class="modal" aria-labelledby="ask-title">
	<div class="flex items-start justify-between gap-4">
		<h2 id="ask-title" class="display text-2xl">Request a feature</h2>
		<button class="dash-btn" onclick={() => ask?.close()} aria-label="Close">
			<X size={15} aria-hidden="true" />
		</button>
	</div>

	{#if form?.featureSent}
		<p class="check mt-6" role="status">
			<CircleCheck size={17} aria-hidden="true" />
			Got it — we will call if we need the detail.
		</p>
		<div class="mt-6 flex justify-end">
			<button class="btn btn-secondary" onclick={() => ask?.close()}>Close</button>
		</div>
	{:else}
		<p class="mt-2 leading-relaxed text-muted">
			Tell us what your shop needs. We read every one, and nothing here is a
			promise until we have quoted it.
		</p>

		<form method="POST" action="?/feature" use:enhance class="mt-6 space-y-4">
			{#if form?.errors?.form}
				<p class="chrome !text-warn-ink" role="alert">{form.errors.form}</p>
			{/if}

			<label class="block">
				<span class="chrome">What do you need?</span>
				<textarea
					name="want"
					rows="3"
					required
					class="field mt-1.5"
					placeholder="Stock alerts on WhatsApp when a size runs out…"
					aria-invalid={form?.errors?.want ? 'true' : undefined}
				>{form?.want ?? ''}</textarea>
				{#if form?.errors?.want}
					<span class="chrome !text-warn-ink" role="alert">{form.errors.want}</span>
				{/if}
			</label>

			<div class="grid gap-4 sm:grid-cols-2">
				<label class="block">
					<span class="chrome">Your name</span>
					<input
						name="name"
						required
						class="field mt-1.5"
						value={form?.name ?? ''}
						aria-invalid={form?.errors?.name ? 'true' : undefined}
					/>
					{#if form?.errors?.name}
						<span class="chrome !text-warn-ink" role="alert">{form.errors.name}</span>
					{/if}
				</label>

				<label class="block">
					<span class="chrome">Mobile</span>
					<input
						name="phone"
						inputmode="tel"
						required
						class="field mt-1.5"
						placeholder="01XXXXXXXXX"
						value={form?.phone ?? ''}
						aria-invalid={form?.errors?.phone ? 'true' : undefined}
					/>
					{#if form?.errors?.phone}
						<span class="chrome !text-warn-ink" role="alert">{form.errors.phone}</span>
					{/if}
				</label>
			</div>

			<!-- Bots fill every field, including the one nobody can see. -->
			<input name="company" tabindex="-1" autocomplete="off" class="sr-only" aria-hidden="true" />

			<div class="flex flex-wrap justify-end gap-3 pt-1">
				<button type="button" class="btn btn-secondary" onclick={() => ask?.close()}>Cancel</button>
				<button type="submit" class="btn btn-primary">Send</button>
			</div>
		</form>
	{/if}
</dialog>

<!-- last chapter -->
<section class="sec">
	<div class="wrap">
		<p class="eyebrow mb-6">{CLOSE.chapter}</p>
		<h2 class="display max-w-[18ch]" style="font-size: var(--text-section)">
			{#each CLOSE.title as line (line)}
				<span class="mask-line"><span>{line}</span></span>
			{/each}
		</h2>
		<p class="mt-8 max-w-[54ch] leading-relaxed text-body" style="font-size: var(--text-lead)">
			{CLOSE.body}
		</p>
		<div class="mt-9 flex flex-wrap gap-3">
			<a href="/contact" class="btn btn-primary">Book a demo</a>
			<a href="https://wa.me/{CONTACT.whatsapp}" class="btn btn-whatsapp">
				<MessageCircle size={15} aria-hidden="true" /> Message on WhatsApp
			</a>
		</div>
	</div>
</section>
