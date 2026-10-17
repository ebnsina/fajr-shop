<script lang="ts">
	import {
		CallIcon,
		Menu01Icon,
		Search01Icon,
		ShoppingBag01Icon
	} from '@hugeicons/core-free-icons';
	import { page } from '$app/state';
	import type { components } from '#lib/api.js';
	import { cart as c, storefront as sf, shop as t } from '#lib/copy.js';
	import Dialog from '#lib/sinaui/ui/Dialog.svelte';
	import Icon from '#lib/sinaui/ui/Icon.svelte';
	import RollingNumber from '#lib/sinaui/ui/RollingNumber.svelte';
	import { bag } from './bag.svelte';

	// The layout most Bangladeshi shops share: a brand-colored bar with a big search box and the
	// bag, a category row under it, and a thin hotline bar on top.
	let {
		store,
		nav,
		count
	}: {
		store: components['schemas']['Store'];
		nav: { label: string; href: string }[];
		count: number;
	} = $props();

	let menu = $state(false);
	const q = $derived(page.url.pathname === '/search' ? (page.url.searchParams.get('q') ?? '') : '');
	const openBag = (e: MouseEvent) => {
		e.preventDefault();
		bag.open = true;
	};
</script>

{#if store.contact_phone || store.contact_email}
	<div class="topbar">
		<div class="row">
			{#if store.contact_phone}
				<a href="tel:{store.contact_phone}"
					><Icon icon={CallIcon} size={14} /> {sf.hotline}: {store.contact_phone}</a
				>
			{/if}
			{#if store.contact_email}<a href="mailto:{store.contact_email}">{store.contact_email}</a>{/if}
		</div>
	</div>
{/if}

<header class="header">
	<div class="row main">
		<button type="button" class="icon narrow" aria-label={t.menu} onclick={() => (menu = true)}>
			<Icon icon={Menu01Icon} size={22} />
		</button>
		<a class="brand" href="/">
			{#if store.logo_url}<img src={store.logo_url} alt={store.name} />{:else}{store.name}{/if}
		</a>
		<form class="search" method="get" action="/search" role="search">
			<label class="sr" for="site-search">{sf.searchLabel}</label>
			<input id="site-search" name="q" type="search" value={q} placeholder={t.searchPlaceholder} />
			<button type="submit" aria-label={sf.searchButton}
				><Icon icon={Search01Icon} size={18} /></button
			>
		</form>
		<a class="bag" href="/cart" aria-label={c.open(count)} onclick={openBag}>
			<span class="bag-icon">
				<Icon icon={ShoppingBag01Icon} size={24} />
				{#if count}<span class="badge" aria-hidden="true"><RollingNumber value={count} /></span
					>{/if}
			</span>
			<span class="label wide">{sf.bag}</span>
		</a>
	</div>
</header>

<nav class="cats" aria-label={sf.categories}>
	<div class="row">
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
		{#if store.contact_phone}
			<a href="tel:{store.contact_phone}">{sf.hotline}: {store.contact_phone}</a>
		{/if}
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
		background: var(--ui-surface);
		font-size: 0.8125rem;
	}
	.topbar .row {
		display: flex;
		justify-content: end;
		gap: 1.5rem;
		padding-block: 0.375rem;
	}
	.topbar a {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		color: var(--ui-muted);
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
		gap: 1.5rem;
		padding-block: 0.875rem;
	}
	.brand {
		color: inherit;
		font-family: var(--font-heading);
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
		max-inline-size: 42rem;
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
		font: 1rem var(--ui-font);
	}
	.search input::placeholder {
		color: var(--ui-muted);
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
		background: var(--ui-accent);
		color: var(--ui-on-accent);
		cursor: pointer;
	}
	.bag,
	.icon {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.375rem;
		border: 0;
		border-radius: var(--ui-radius-control);
		background: none;
		color: inherit;
		font: 600 0.9375rem var(--ui-font);
		text-decoration: none;
		cursor: pointer;
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
		background: var(--ui-surface);
		color: var(--ui-fg);
		font-size: 0.75rem;
		font-variant-numeric: tabular-nums;
	}
	.cats {
		background: var(--ui-surface);
		box-shadow: 0 1px 0 var(--ui-line);
	}
	.cats .row {
		display: flex;
		gap: 0.25rem;
		overflow-x: auto;
		scrollbar-width: none;
	}
	.cats a {
		flex: none;
		padding: 0.75rem 0.875rem;
		color: var(--ui-fg);
		font-size: 0.875rem;
		font-weight: 500;
		text-decoration: none;
		white-space: nowrap;
	}
	.cats a:hover,
	.cats a[aria-current='page'] {
		color: var(--ui-accent);
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
	a:focus-visible,
	button:focus-visible,
	input:focus-visible {
		outline: var(--ui-ring-width) solid var(--ui-on-accent);
		outline-offset: 2px;
	}
	.cats a:focus-visible,
	.sheet a:focus-visible,
	.topbar a:focus-visible {
		outline-color: var(--ui-ring);
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
			grid-template-columns: auto minmax(0, 1fr) auto;
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
		.bag {
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
