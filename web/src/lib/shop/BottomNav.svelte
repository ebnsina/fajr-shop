<script lang="ts">
	import House from '@lucide/svelte/icons/house';
	import LayoutGrid from '@lucide/svelte/icons/layout-grid';
	import ShoppingBag from '@lucide/svelte/icons/shopping-bag';
	import User from '@lucide/svelte/icons/user';
	import { page } from '$app/state';
	import { account as a, cart as c, storefront as sf } from '#lib/copy.js';
	import { bag } from './bag.svelte';

	// Phones only: the places shoppers go most, within thumb's reach.
	let { count, signedIn }: { count: number; signedIn: boolean } = $props();
	const at = (href: string) =>
		page.url.pathname.startsWith(href) && (href !== '/' || page.url.pathname === '/');
</script>

<nav class="bottom" aria-label={sf.bottomNav}>
	<a href="/" aria-current={at('/') ? 'page' : undefined}><House size={21} />{sf.home}</a>
	<a href="/shop" aria-current={at('/shop') || at('/c/') ? 'page' : undefined}
		><LayoutGrid size={21} />{sf.categories}</a
	>
	<a
		href="/cart"
		aria-label={c.open(count)}
		onclick={(e) => {
			e.preventDefault();
			bag.open = true;
		}}
	>
		<span class="icon"
			><ShoppingBag size={21} />{#if count}<span class="badge" aria-hidden="true">{count}</span
				>{/if}</span
		>
		<span aria-hidden="true">{sf.bag}</span>
	</a>
	<a
		href={signedIn ? '/account' : '/account/login'}
		aria-current={at('/account') ? 'page' : undefined}><User size={21} />{a.account}</a
	>
</nav>

<style>
	.bottom {
		display: none;
	}
	@media (width < 48rem) {
		.bottom {
			position: fixed;
			inset-inline: 0;
			inset-block-end: 0;
			z-index: 20;
			display: grid;
			grid-template-columns: repeat(4, 1fr);
			padding-block-end: env(safe-area-inset-bottom);
			background: var(--ui-surface);
			box-shadow:
				0 -1px 0 var(--ui-line),
				0 -6px 20px -12px color-mix(in srgb, var(--text-primary) 20%, transparent);
		}
		a {
			display: grid;
			justify-items: center;
			gap: 0.125rem;
			padding-block: 0.5rem;
			color: var(--ui-muted);
			font-size: 0.6875rem;
			font-weight: 500;
			text-decoration: none;
		}
		a[aria-current='page'] {
			color: var(--ui-accent);
		}
		.icon {
			position: relative;
			display: inline-flex;
		}
		.badge {
			position: absolute;
			inset-block-start: -0.375rem;
			inset-inline-end: -0.625rem;
			min-inline-size: 1.125rem;
			block-size: 1.125rem;
			padding-inline: 0.25rem;
			box-sizing: border-box;
			border-radius: 999px;
			background: var(--ui-accent);
			color: var(--ui-on-accent);
			font-size: 0.6875rem;
			line-height: 1.125rem;
			text-align: center;
		}
	}
</style>
