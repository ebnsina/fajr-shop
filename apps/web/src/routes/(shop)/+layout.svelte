<script lang="ts">
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import {
		Cancel01FreeIcons,
		Menu01FreeIcons,
		Search01FreeIcons,
		ShoppingBag01FreeIcons
	} from '@hugeicons/core-free-icons';
	import { page } from '$app/state';
	import { getTheme, themeCss } from '$lib/themes';
	import JsonLd from '$lib/components/JsonLd.svelte';

	let { data, children } = $props();

	let menuOpen = $state(false);
	let searchOpen = $state(false);

	const theme = $derived(getTheme(data.store.theme));
	const canonical = $derived(`${page.url.origin}${page.url.pathname}`);

	// One place owns every meta tag. Pages contribute through `meta` in their load,
	// so a page can never render a second og:title alongside the layout's.
	const meta = $derived({
		title: page.data.meta?.title ?? data.store.name,
		description: page.data.meta?.description ?? data.store.tagline ?? '',
		type: page.data.meta?.type ?? 'website',
		image: page.data.meta?.image ?? data.store.logoUrl,
		noindex: page.data.meta?.noindex ?? false
	});

	// og:locale wants a full locale, and BD Bangla is bn_BD.
	const ogLocale = $derived(data.store.locale === 'bn' ? 'bn_BD' : 'en_GB');

	const org = $derived({
		'@context': 'https://schema.org',
		'@type': 'Store',
		name: data.store.name,
		url: page.url.origin,
		...(data.store.supportPhone ? { telephone: data.store.supportPhone } : {}),
		address: { '@type': 'PostalAddress', addressCountry: data.store.country ?? 'BD' }
	});

	const year = new Date().getFullYear();
</script>

<svelte:head>
	{@html `<style>${themeCss(theme)}</style>`}

	<title>{meta.title}</title>
	{#if meta.description}<meta name="description" content={meta.description} />{/if}
	<link rel="canonical" href={canonical} />
	{#if meta.noindex}<meta name="robots" content="noindex" />{/if}

	<meta property="og:site_name" content={data.store.name} />
	<meta property="og:url" content={canonical} />
	<meta property="og:type" content={meta.type} />
	<meta property="og:locale" content={ogLocale} />
	<meta property="og:title" content={meta.title} />
	{#if meta.description}<meta property="og:description" content={meta.description} />{/if}
	{#if meta.image}<meta property="og:image" content={meta.image} />{/if}

	<meta name="twitter:card" content={meta.image ? 'summary_large_image' : 'summary'} />
	<meta name="twitter:title" content={meta.title} />
	{#if meta.description}<meta name="twitter:description" content={meta.description} />{/if}
	{#if meta.image}<meta name="twitter:image" content={meta.image} />{/if}
</svelte:head>

<JsonLd data={org} />

<a href="#main" class="skip">Skip to content</a>

<!-- The promise BD shoppers scan for first. Empty hides it entirely. -->
{#if data.store.announcement}
	<p class="announce">{data.store.announcement}</p>
{/if}

<header>
	<div class="bar">
		<button
			class="icon lg-hide"
			onclick={() => (menuOpen = true)}
			aria-label="Open menu"
			aria-expanded={menuOpen}
		>
			<HugeiconsIcon icon={Menu01FreeIcons} size={20} strokeWidth={1.75} aria-hidden="true" />
		</button>

		<a href="/" class="wordmark">{data.store.name}</a>

		<nav class="primary" aria-label="Main">
			{#each data.nav as item (item.id)}
				<a href={item.href} aria-current={page.url.pathname === item.href ? 'page' : undefined}>
					{item.label}
				</a>
			{/each}
		</nav>

		<div class="actions">
			<button
				class="icon"
				onclick={() => (searchOpen = !searchOpen)}
				aria-label="Search01FreeIcons"
				aria-expanded={searchOpen}
			>
				<HugeiconsIcon icon={Search01FreeIcons} size={20} strokeWidth={1.75} aria-hidden="true" />
			</button>

			<a href="/cart" class="icon bag" aria-label="Bag{data.cartCount ? `, ${data.cartCount} items` : ', empty'}">
				<HugeiconsIcon icon={ShoppingBag01FreeIcons} size={20} strokeWidth={1.75} aria-hidden="true" />
				{#if data.cartCount}<span class="count">{data.cartCount}</span>{/if}
			</a>
		</div>
	</div>

	{#if searchOpen}
		<form action="/search" class="searchbar">
			<!-- svelte-ignore a11y_autofocus -->
			<input name="q" type="search" placeholder="Search01FreeIcons for sarees, kurti…" aria-label="Search01FreeIcons products" autofocus />
			<button type="submit">Search01FreeIcons</button>
		</form>
	{/if}
</header>

{#if menuOpen}
	<div class="drawer" role="dialog" aria-modal="true" aria-label="Menu">
		<div class="drawer-head">
			<span class="wordmark">{data.store.name}</span>
			<button class="icon" onclick={() => (menuOpen = false)} aria-label="Close menu">
				<HugeiconsIcon icon={Cancel01FreeIcons} size={20} strokeWidth={1.75} aria-hidden="true" />
			</button>
		</div>
		<nav aria-label="Main">
			{#each data.nav as item (item.id)}
				<a href={item.href} onclick={() => (menuOpen = false)}>{item.label}</a>
			{/each}
			<a href="/track" onclick={() => (menuOpen = false)}>Track your order</a>
		</nav>
	</div>
	<button class="scrim" onclick={() => (menuOpen = false)} aria-label="Close menu"></button>
{/if}

<main id="main">{@render children()}</main>

<footer>
	<div class="cols">
		<div>
			<p class="wordmark">{data.store.name}</p>
			{#if data.store.tagline}<p class="muted">{data.store.tagline}</p>{/if}
		</div>

		<div>
			<h2>Shop</h2>
			<ul>
				{#each data.nav.slice(0, 4) as item (item.id)}
					<li><a href={item.href}>{item.label}</a></li>
				{/each}
			</ul>
		</div>

		<div>
			<h2>Help</h2>
			<ul>
				<li><a href="/track">Track your order</a></li>
				<li><a href="/p/returns">Returns &amp; exchange</a></li>
				<li><a href="/p/delivery">Delivery &amp; charges</a></li>
			</ul>
		</div>

		<div>
			<h2>Contact</h2>
			<ul>
				{#if data.store.supportPhone}
					<li><a href="tel:{data.store.supportPhone}">{data.store.supportPhone}</a></li>
				{/if}
				{#if data.store.supportHours}<li class="muted">{data.store.supportHours}</li>{/if}
			</ul>
		</div>
	</div>

	<p class="fine">© {year} {data.store.name}</p>
</footer>

<style>
	:global(body) {
		background: var(--c-bg);
		color: var(--c-text);
		font-family: var(--font-body);
	}

	.skip {
		position: absolute;
		inset-inline-start: -9999px;
		z-index: 100;
	}

	.skip:focus {
		inset-inline-start: 1rem;
		inset-block-start: 1rem;
		padding: 0.75rem 1rem;
		background: var(--c-text);
		color: var(--c-bg);
		border-radius: var(--radius);
	}

	.announce {
		margin: 0;
		padding: 0.5rem 1rem;
		text-align: center;
		background: var(--c-text);
		color: var(--c-bg);
		font-size: 0.8125rem;
		letter-spacing: 0.01em;
	}

	header {
		position: sticky;
		inset-block-start: 0;
		z-index: 20;
		background: var(--c-surface);
		border-block-end: 1px solid var(--c-line);
	}

	.bar {
		display: flex;
		align-items: center;
		gap: 1rem;
		max-inline-size: 80rem;
		margin-inline: auto;
		padding: 0.875rem 1.5rem;
	}

	.wordmark {
		font-family: var(--font-display);
		font-size: 1.25rem;
		letter-spacing: 0.01em;
		text-decoration: none;
		color: inherit;
		margin: 0;
	}

	.primary {
		display: none;
		gap: 1.75rem;
		margin-inline-start: 1.5rem;
		font-size: 0.9375rem;
	}

	@media (min-width: 56rem) {
		.primary {
			display: flex;
		}
		/* Declared after `.icon`, and more specific, so it actually wins. */
		button.icon.lg-hide {
			display: none;
		}
	}

	.primary a {
		color: var(--c-muted);
		text-decoration: none;
		padding-block: 0.25rem;
		border-block-end: 1px solid transparent;
	}

	.primary a:hover,
	.primary a[aria-current='page'] {
		color: var(--c-text);
		border-block-end-color: var(--c-text);
	}

	.actions {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		margin-inline-start: auto;
	}

	/* 44px targets: this is a phone-first audience. */
	.icon {
		display: grid;
		place-items: center;
		inline-size: 2.75rem;
		block-size: 2.75rem;
		border: 0;
		background: none;
		color: inherit;
		border-radius: var(--radius);
		cursor: pointer;
		text-decoration: none;
		position: relative;
	}

	.icon:hover {
		background: var(--c-bg);
	}

	.count {
		position: absolute;
		inset-block-start: 0.375rem;
		inset-inline-end: 0.375rem;
		min-inline-size: 1.125rem;
		block-size: 1.125rem;
		display: grid;
		place-items: center;
		padding-inline: 0.25rem;
		border-radius: 999px;
		background: var(--c-accent);
		color: var(--c-accent-text);
		font-size: 0.6875rem;
		line-height: 1;
	}

	.searchbar {
		display: flex;
		gap: 0.5rem;
		max-inline-size: 80rem;
		margin-inline: auto;
		padding: 0 1.5rem 0.875rem;
	}

	.searchbar input {
		flex: 1;
		padding: 0.75rem 1rem;
		border: 1px solid var(--c-line);
		border-radius: var(--radius);
		font: inherit;
		background: var(--c-bg);
	}

	.searchbar button {
		padding: 0.75rem 1.25rem;
		border: 0;
		border-radius: var(--radius);
		background: var(--c-accent);
		color: var(--c-accent-text);
		font: inherit;
		cursor: pointer;
	}

	.drawer {
		position: fixed;
		inset-block: 0;
		inset-inline-start: 0;
		z-index: 40;
		inline-size: min(20rem, 85vw);
		background: var(--c-surface);
		padding: 1rem;
		display: flex;
		flex-direction: column;
	}

	.drawer-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-block-end: 1rem;
	}

	.drawer nav {
		display: flex;
		flex-direction: column;
	}

	.drawer nav a {
		padding: 0.875rem 0.5rem;
		border-block-end: 1px solid var(--c-line);
		text-decoration: none;
		color: inherit;
	}

	.scrim {
		position: fixed;
		inset: 0;
		z-index: 30;
		border: 0;
		background: rgb(0 0 0 / 0.35);
	}

	main {
		max-inline-size: 80rem;
		margin-inline: auto;
		padding: var(--grid-gap) 1.5rem 4rem;
	}

	footer {
		border-block-start: 1px solid var(--c-line);
		background: var(--c-surface);
		padding: 3rem 1.5rem 2rem;
	}

	.cols {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr));
		gap: 2rem;
		max-inline-size: 80rem;
		margin-inline: auto;
	}

	footer h2 {
		font-size: 0.8125rem;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--c-muted);
		margin: 0 0 0.75rem;
	}

	footer ul {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		gap: 0.5rem;
		font-size: 0.9375rem;
	}

	footer a {
		color: inherit;
		text-decoration: none;
	}

	footer a:hover {
		text-decoration: underline;
	}

	.muted {
		color: var(--c-muted);
		font-size: 0.9375rem;
		margin: 0.5rem 0 0;
	}

	.fine {
		max-inline-size: 80rem;
		margin: 2.5rem auto 0;
		padding-block-start: 1.5rem;
		border-block-start: 1px solid var(--c-line);
		color: var(--c-muted);
		font-size: 0.8125rem;
	}
</style>
