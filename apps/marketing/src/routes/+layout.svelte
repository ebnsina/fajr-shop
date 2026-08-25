<script lang="ts">
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import { Cancel01FreeIcons, Menu01FreeIcons } from '@hugeicons/core-free-icons';
	import favicon from '$lib/assets/favicon.svg';
	import '../app.css';
	import { page } from '$app/state';
	import { CONTACT, META, SITE_URL } from '$lib/content';

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
</svelte:head>

<a href="#main" class="sr-only focus:not-sr-only focus:absolute focus:start-4 focus:top-4 focus:z-50 focus:rounded-xl focus:bg-strong focus:px-4 focus:py-3 focus:text-raised">
	Skip to content
</a>

<header class="site-header">
	<div class="mx-auto flex max-w-6xl items-center gap-3 px-6 py-3.5">
		<a href="/" class="flex items-center gap-2.5">
			<span class="grid size-8 place-items-center rounded-xl bg-primary-600 text-sm font-semibold text-white">F</span>
			<span class="font-semibold tracking-tight text-strong">Fajr Shop</span>
		</a>

		<nav class="ms-6 hidden items-center gap-6 text-sm md:flex" aria-label="Main">
			{#each NAV as item (item.href)}
				<a
					href={item.href}
					class="text-muted transition hover:text-strong"
					aria-current={page.url.pathname === item.href ? 'page' : undefined}
				>
					{item.label}
				</a>
			{/each}
		</nav>

		<div class="ms-auto flex items-center gap-2">
			<a href="/contact" class="btn btn-primary !px-4 !py-2 !text-sm">Book a demo</a>
			<button
				class="btn btn-secondary !px-2.5 !py-2 md:hidden"
				onclick={() => (open = !open)}
				aria-label={open ? 'Close menu' : 'Open menu'}
				aria-expanded={open}
			>
				{#if open}<HugeiconsIcon icon={Cancel01FreeIcons} size={18} aria-hidden="true" />{:else}<HugeiconsIcon icon={Menu01FreeIcons} size={18} aria-hidden="true" />{/if}
			</button>
		</div>
	</div>

	{#if open}
		<nav class="border-t border-line px-6 py-2 md:hidden" aria-label="Main">
			{#each NAV as item (item.href)}
				<a href={item.href} onclick={() => (open = false)} class="block border-b border-line py-3 text-sm last:border-0">
					{item.label}
				</a>
			{/each}
		</nav>
	{/if}
</header>

<main id="main">{@render children()}</main>

<footer class="mt-24 border-t border-line bg-sunken">
	<div class="mx-auto grid max-w-6xl gap-8 px-6 py-14 sm:grid-cols-2 lg:grid-cols-4">
		<div>
			<p class="font-semibold tracking-tight text-strong">Fajr Shop</p>
			<p class="mt-2 text-sm text-muted">
				Ecommerce built for how South Asia and the Gulf actually sell: cash on delivery,
				courier returns, and Facebook traffic.
			</p>
		</div>

		<div>
			<h2 class="display text-xs font-medium uppercase tracking-wide text-faint">Product</h2>
			<ul class="mt-3 space-y-2 text-sm">
				<li><a href="/#what-it-does" class="text-muted hover:text-strong">What it does</a></li>
				<li><a href="/#roadmap" class="text-muted hover:text-strong">Roadmap</a></li>
				<li><a href="/pricing" class="text-muted hover:text-strong">Pricing</a></li>
			</ul>
		</div>

		<div>
			<h2 class="display text-xs font-medium uppercase tracking-wide text-faint">Talk to us</h2>
			<ul class="mt-3 space-y-2 text-sm">
				<li><a href="/contact" class="text-muted hover:text-strong">Book a demo</a></li>
				<li><a href="https://wa.me/{CONTACT.whatsapp}" class="text-muted hover:text-strong">WhatsApp</a></li>
				<li><a href="mailto:{CONTACT.email}" class="text-muted hover:text-strong">{CONTACT.email}</a></li>
			</ul>
		</div>

		<div>
			<h2 class="display text-xs font-medium uppercase tracking-wide text-faint">Honest notes</h2>
			<p class="mt-3 text-sm text-muted">
				We set up and run each shop ourselves. That caps how many merchants we
				take on, and it is why support is same-day rather than a ticket queue.
			</p>
		</div>
	</div>

	<p class="mx-auto max-w-6xl border-t border-line px-6 py-6 text-xs text-faint">
		© {year} Fajr Shop.
	</p>
</footer>
