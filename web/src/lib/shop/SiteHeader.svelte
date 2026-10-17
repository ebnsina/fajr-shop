<script lang="ts">
	import Heart from '@lucide/svelte/icons/heart';
	import Mail from '@lucide/svelte/icons/mail';
	import Menu from '@lucide/svelte/icons/menu';
	import Phone from '@lucide/svelte/icons/phone';
	import Search from '@lucide/svelte/icons/search';
	import ShoppingBag from '@lucide/svelte/icons/shopping-bag';
	import User from '@lucide/svelte/icons/user';
	import { page } from '$app/state';
	import { scrollEdges } from '#lib/sinaui/ui/scroll-edges.js';
	import type { components } from '#lib/api.js';
	import {
		account as a,
		cart as c,
		storefront as sf,
		shop as t,
		wishlist as w
	} from '#lib/copy.js';
	import Dialog from '#lib/sinaui/ui/Dialog.svelte';
	import RollingNumber from '#lib/sinaui/ui/RollingNumber.svelte';
	import { bag } from './bag.svelte';

	// The layout most Bangladeshi shops share: a thin contact bar, a brand-colored bar with the
	// logo, a big search box, sign-in and the bag, then a row of departments.
	let {
		store,
		nav,
		count,
		saved,
		me
	}: {
		store: components['schemas']['Store'];
		nav: { label: string; href: string }[];
		count: number;
		/** How many products the customer has saved. */
		saved: number;
		me: components['schemas']['User'] | null;
	} = $props();

	let menu = $state(false);
	const q = $derived(page.url.pathname === '/search' ? (page.url.searchParams.get('q') ?? '') : '');
	const openBag = (e: MouseEvent) => {
		e.preventDefault();
		bag.open = true;
	};
</script>

<div class="topbar">
	<div class="row">
		{#if store.contact_phone}
			<a href="tel:{store.contact_phone}"><Phone size={13} /> {sf.hotline}: {store.contact_phone}</a
			>
		{/if}
		{#if store.contact_email}
			<a href="mailto:{store.contact_email}"><Mail size={13} /> {store.contact_email}</a>
		{/if}
	</div>
</div>

<header class="header">
	<div class="row main">
		<button type="button" class="icon narrow" aria-label={t.menu} onclick={() => (menu = true)}>
			<Menu size={22} />
		</button>
		<a class="brand" href="/">
			{#if store.logo_url}<img src={store.logo_url} alt={store.name} />{:else}{store.name}{/if}
		</a>
		<form class="search" method="get" action="/search" role="search">
			<label class="sr" for="site-search">{sf.searchLabel}</label>
			<input id="site-search" name="q" type="search" value={q} placeholder={t.searchPlaceholder} />
			<button type="submit" aria-label={sf.searchButton}><Search size={18} /></button>
		</form>
		<div class="actions">
			{#if me}
				<a class="action wide" href="/account"><User size={20} /><span>{a.hello(me.name)}</span></a>
			{:else}
				<span class="action wide">
					<User size={20} />
					<a href="/account/login">{a.signIn}</a><span aria-hidden="true">|</span><a
						href="/account/register">{a.register}</a
					>
				</span>
			{/if}
			<a class="action" href="/wishlist" aria-label={w.open(saved)}>
				<span class="bag-icon">
					<Heart size={24} />
					{#if saved}<span class="badge saved" aria-hidden="true"
							><RollingNumber value={saved} /></span
						>{/if}
				</span>
			</a>
			<a class="action bag" href="/cart" aria-label={c.open(count)} onclick={openBag}>
				<span class="bag-icon">
					<ShoppingBag size={24} />
					<span class="badge" aria-hidden="true"><RollingNumber value={count} /></span>
				</span>
			</a>
		</div>
	</div>
</header>

<nav class="cats" aria-label={sf.categories}>
	<!-- Fades out at an edge with more to scroll to, instead of cutting a name in half. -->
	<div class="row" {@attach scrollEdges} data-fade="x">
		{#each nav as link (link.href)}
			<a href={link.href} aria-current={page.url.pathname === link.href ? 'page' : undefined}
				>{link.label}</a
			>
		{/each}
	</div>
</nav>

<Dialog bind:open={menu} side="start" title={store.name}>
	<nav class="sheet" aria-label={sf.categories}>
		{#each nav as link (link.href)}
			<a href={link.href} onclick={() => (menu = false)}>{link.label}</a>
		{/each}
		<a href={me ? '/account' : '/account/login'} onclick={() => (menu = false)}
			>{me ? a.yourAccount : a.signIn}</a
		>
		{#if store.contact_phone}<a href="tel:{store.contact_phone}"
				>{sf.hotline}: {store.contact_phone}</a
			>{/if}
	</nav>
</Dialog>

<style>
	.row {
		box-sizing: border-box;
		inline-size: min(80rem, 100%);
		margin-inline: auto;
		padding-inline: 1rem;
	}
	.topbar {
		background: var(--bg-subtle);
		font-size: 0.8125rem;
	}
	.topbar .row {
		display: flex;
		justify-content: end;
		gap: 1.5rem;
		min-block-size: 1.875rem;
		align-items: center;
	}
	.topbar a {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		color: var(--text-secondary);
		text-decoration: none;
	}
	.header {
		position: sticky;
		inset-block-start: 0;
		z-index: 20;
		background: var(--ui-accent);
		color: var(--ui-on-accent);
	}
	.main {
		display: grid;
		grid-template-columns: auto minmax(0, 1fr) auto;
		align-items: center;
		gap: 2rem;
		padding-block: 0.875rem;
	}
	.brand {
		color: inherit;
		font-size: 1.375rem;
		font-weight: 700;
		text-decoration: none;
		white-space: nowrap;
	}
	.brand img {
		display: block;
		max-block-size: 2.75rem;
		max-inline-size: 11rem;
		object-fit: contain;
	}
	.search {
		position: relative;
		display: flex;
		inline-size: 100%;
		max-inline-size: 44rem;
		justify-self: center;
	}
	.search input {
		flex: 1;
		min-inline-size: 0;
		block-size: 2.75rem;
		padding: 0 3rem 0 1rem;
		border: 0;
		border-radius: var(--ui-radius-control);
		background: var(--ui-surface);
		color: var(--ui-fg);
		font: 0.9375rem var(--ui-font);
	}
	.search input::placeholder {
		color: var(--text-muted);
	}
	.search button {
		position: absolute;
		inset-block: 0.25rem;
		inset-inline-end: 0.25rem;
		display: grid;
		place-items: center;
		inline-size: 2.25rem;
		border: 0;
		border-radius: calc(var(--ui-radius-control) - 0.125rem);
		background: var(--brand-800);
		color: var(--on-dark);
		cursor: pointer;
	}
	.search button:hover {
		background: var(--brand-700);
	}
	.actions {
		display: flex;
		align-items: center;
		gap: 1.25rem;
	}
	.action {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		color: inherit;
		font-size: 0.875rem;
		font-weight: 500;
		text-decoration: none;
		white-space: nowrap;
	}
	.action a {
		color: inherit;
		text-decoration: none;
	}
	.action a:hover {
		text-decoration: underline;
	}
	.bag-icon {
		position: relative;
		display: inline-flex;
	}
	.badge {
		position: absolute;
		inset-block-start: -0.5rem;
		inset-inline-end: -0.625rem;
		display: grid;
		place-items: center;
		min-inline-size: 1.25rem;
		block-size: 1.25rem;
		padding-inline: 0.25rem;
		box-sizing: border-box;
		border-radius: 999px;
		background: var(--accent-700);
		color: var(--on-dark);
		font-size: 0.6875rem;
		font-weight: 700;
		font-variant-numeric: tabular-nums;
	}
	/* Only the bag's count is orange; the saved count stays in the header's own colors. */
	.badge.saved {
		background: var(--bg-surface);
		color: var(--brand-800);
	}
	.icon {
		display: inline-flex;
		padding: 0.25rem;
		border: 0;
		background: none;
		color: inherit;
		cursor: pointer;
	}
	.cats {
		border-block-end: 1px solid var(--border);
		background: var(--bg-surface);
	}
	.cats .row {
		display: flex;
		gap: 0.25rem;
		overflow-x: auto;
		scrollbar-width: none;
	}
	.cats a {
		flex: none;
		padding: 0.75rem 0.75rem;
		color: var(--ui-fg);
		font-size: 0.875rem;
		font-weight: 500;
		text-decoration: none;
		white-space: nowrap;
	}
	.cats a:hover,
	.cats a[aria-current='page'] {
		color: var(--brand-600);
		box-shadow: inset 0 -2px 0 currentColor;
	}
	.sheet {
		display: grid;
		gap: 0.25rem;
	}
	.sheet a {
		padding: 0.75rem;
		border-radius: var(--ui-radius-control);
		color: var(--ui-fg);
		font: 500 1rem var(--ui-font);
		text-decoration: none;
	}
	.header :is(a, button, input):focus-visible {
		outline: var(--ui-ring-width) solid var(--ui-on-accent);
		outline-offset: 2px;
	}
	.cats a:focus-visible,
	.sheet a:focus-visible,
	.topbar a:focus-visible {
		outline: var(--ui-ring-width) solid var(--ui-ring);
		outline-offset: 2px;
	}
	.sr {
		position: absolute;
		inline-size: 1px;
		block-size: 1px;
		overflow: hidden;
		clip-path: inset(50%);
	}
	@media (width < 48rem) {
		.topbar {
			display: none;
		}
		.main {
			grid-template-areas: 'menu brand bag' 'search search search';
			gap: 0.625rem 0.5rem;
			padding-block: 0.625rem;
		}
		.narrow {
			grid-area: menu;
		}
		.brand {
			grid-area: brand;
		}
		.actions {
			grid-area: bag;
		}
		.search {
			grid-area: search;
			max-inline-size: none;
		}
		.wide {
			display: none;
		}
	}
	@media (width >= 48rem) {
		.narrow {
			display: none;
		}
	}
</style>
