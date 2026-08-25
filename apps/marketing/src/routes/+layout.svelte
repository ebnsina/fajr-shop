<script lang="ts">
	import { X, Menu } from '@lucide/svelte';
	import Arrow from '$lib/Arrow.svelte';
	import Mark from '$lib/Mark.svelte';
	import favicon from '$lib/assets/favicon.svg';
	import '../app.css';
	import { page } from '$app/state';
	import { CONTACT, META, SITE_URL, SOCIAL, LEGAL } from '$lib/content';

	let { children } = $props();
	let open = $state(false);

	const NAV = [
		{ href: '/#what-it-does', label: 'What it does' },
		{ href: '/demo', label: 'Live demos' },
		{ href: '/#roadmap', label: 'Roadmap' },
		{ href: '/pricing', label: 'Pricing' },
		{ href: '/contact', label: 'Contact' }
	];

	const year = new Date().getFullYear();

	// Canonical and OG live here, not per page: this site gets shared by pasting a link into.
	const canonical = $derived(new URL(page.url.pathname, SITE_URL).href);
	// A route can supply its own via load; static META covers the fixed pages.
	const meta = $derived(page.data.meta ?? META[page.url.pathname] ?? META['/']!);
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>{meta.title}</title>
	<meta name="description" content={meta.description} />
	<link rel="canonical" href={canonical} />
	<meta property="og:title" content={meta.title} />
	<meta property="og:description" content={meta.description} />
	<meta property="og:type" content="website" />
	<meta property="og:url" content={canonical} />
	<meta property="og:site_name" content="Fajr Shop" />
	<meta property="og:locale" content="en_GB" />
	<meta name="twitter:card" content="summary_large_image" />
	<!-- The share card is how this site travels here: a link pasted into
	     WhatsApp. An absolute URL, because a relative one is ignored by every
	     crawler that matters. -->
	<meta property="og:image" content={new URL('/og.png', SITE_URL).href} />
	<meta property="og:image:width" content="1511" />
	<meta property="og:image:height" content="793" />
	<meta property="og:image:alt" content="Fajr Shop — your return rate is the problem, not your website" />
	<meta name="twitter:image" content={new URL('/og.png', SITE_URL).href} />
	<meta name="theme-color" content="#ffffff" />
</svelte:head>

<a href="#main" class="sr-only focus:not-sr-only focus:absolute focus:start-4 focus:top-4 focus:z-50 focus:bg-bone focus:px-4 focus:py-3 focus:text-void">
	Skip to content
</a>

<header class="site-header">
	<!-- Three tracks, so the nav is centred on the page rather than on whatever
	     is left after the wordmark. -->
	<div class="wrap grid grid-cols-[1fr_auto_1fr] items-center gap-3">
		<a href="/" class="flex items-center gap-2.5 justify-self-start py-2" aria-label="Fajr Shop, home">
			<Mark />
			<span class="display text-[1.0625rem] font-medium tracking-[-0.3px] text-strong">Fajr Shop</span>
		</a>

		<nav class="hidden items-center justify-center md:flex" aria-label="Main">
			{#each NAV as item (item.href)}
				<a
					href={item.href}
					class="nav-link chrome hover:text-strong"
					aria-current={page.url.pathname === item.href ? 'page' : undefined}
				>
					{item.label}
				</a>
			{/each}
		</nav>

		<div class="col-start-3 flex items-center justify-end gap-2">
			<a href="/contact" class="btn btn-primary btn-compact">Book a demo</a>
			<button
				class="btn btn-secondary btn-compact !px-3 md:hidden"
				onclick={() => (open = !open)}
				aria-label={open ? 'Close menu' : 'Open menu'}
				aria-expanded={open}
			>
				{#if open}<X size={18} aria-hidden="true" />{:else}<Menu size={18} aria-hidden="true" />{/if}
			</button>
		</div>
	</div>

	{#if open}
		<nav class="wrap border-t border-line md:hidden" aria-label="Main">
			{#each NAV as item (item.href)}
				<a href={item.href} onclick={() => (open = false)} class="chrome flex min-h-11 items-center border-b border-line last:border-0">
					{item.label}
				</a>
			{/each}
		</nav>
	{/if}
</header>

<!-- Opaque and one layer up, so the last scroll slides it off the footer. -->
<main id="main" class="page-body">{@render children()}</main>

<footer class="site-footer bg-strong text-bone">
	<div class="wrap py-[clamp(56px,10vh,110px)]">
		<!-- The first column is prose and the other three are lists, so it gets
		     the room to read at a sensible measure. -->
		<div class="stagger grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.7fr_1fr_1fr_1fr]">
			<div>
				<h2 class="flex items-center gap-2.5">
					<Mark size={20} tone="bone" />
					<span class="display text-[1.0625rem] font-medium tracking-[-0.3px] text-bone">Fajr Shop</span>
				</h2>
				<p class="mt-4 max-w-[46ch] leading-relaxed text-[var(--color-primary-200)]">
					Ecommerce for shops that sell cash on delivery, lose money to returns,
					and get most of their traffic from an ad. We set up and run each one
					ourselves, which caps how many merchants we take on — and is why
					support is same-day rather than a ticket queue.
				</p>
			</div>

			<div>
				<h2 class="chrome uppercase tracking-[0.12em] !text-[var(--color-primary-300)]">The story so far</h2>
				<ul class="mt-4 space-y-2.5">
					<li><a href="/#what-it-does" class="link link-inverse">What it does <Arrow /></a></li>
					<li><a href="/#roadmap" class="link link-inverse">What comes next <Arrow /></a></li>
					<li><a href="/pricing" class="link link-inverse">What it costs <Arrow /></a></li>
				</ul>
			</div>

			<div>
				<h2 class="chrome uppercase tracking-[0.12em] !text-[var(--color-primary-300)]">Start yours</h2>
				<ul class="mt-4 space-y-2.5">
					<li><a href="/demo" class="link link-inverse">Open a demo shop <Arrow /></a></li>
					<li><a href="/contact" class="link link-inverse">Book a demo call <Arrow /></a></li>
					<li><a href="https://wa.me/{CONTACT.whatsapp}" class="link link-inverse">WhatsApp us <Arrow /></a></li>
					<li><a href="mailto:{CONTACT.email}" class="link link-inverse">{CONTACT.email} <Arrow /></a></li>
				</ul>
			</div>

			<div>
				<h2 class="chrome uppercase tracking-[0.12em] !text-[var(--color-primary-300)]">Follow along</h2>
				<ul class="mt-4 space-y-2.5">
					{#each SOCIAL as s (s.label)}
						<li><a href={s.href} rel="me noopener" class="text-bone hover:underline">{s.label}</a></li>
					{/each}
					<li><a href="https://wa.me/{CONTACT.whatsapp}" class="link link-inverse">WhatsApp <Arrow /></a></li>
				</ul>
			</div>
		</div>

		<div class="mt-16 flex flex-wrap items-center justify-between gap-4">
			<p class="chrome !text-[var(--color-primary-300)]">© {year} Fajr Shop.</p>
			<ul class="chrome flex flex-wrap gap-x-6 gap-y-2 !text-[var(--color-primary-300)]">
				{#each LEGAL as l (l.href)}
					<li><a href={l.href} class="link link-inverse">{l.label} <Arrow /></a></li>
				{/each}
			</ul>
		</div>
	</div>
</footer>
