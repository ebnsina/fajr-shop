<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { cart as c, errorText, shop as t } from '#lib/copy.js';
	import { toast, Toaster } from '#lib/sinaui/ui/toast/index.js';
	import BagDrawer from '#lib/shop/BagDrawer.svelte';
	import BackToTop from '#lib/shop/BackToTop.svelte';
	import BottomNav from '#lib/shop/BottomNav.svelte';
	import SiteFooter from '#lib/shop/SiteFooter.svelte';
	import SiteHeader from '#lib/shop/SiteHeader.svelte';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();

	const vat = $derived(data.store.vat);
	const vatNote = $derived(
		vat.enabled && !vat.prices_include_vat
			? c.vatNote(
					new Intl.NumberFormat('en-BD', { style: 'percent', maximumFractionDigits: 2 }).format(
						vat.rate_bp / 10000
					)
				)
			: undefined
	);
	const nav = $derived([
		{ label: t.all, href: '/shop' },
		...data.categories
			.filter((c) => !c.parent_id)
			.map((c) => ({ label: c.name, href: `/c/${c.slug}` }))
	]);
</script>

<div class="site">
	<a class="skip" href="#main">{t.skip}</a>
	<SiteHeader
		store={data.store}
		{nav}
		count={data.cart.item_count}
		saved={data.saved.length}
		me={data.me}
	/>
	<div id="main" class="site-main" role="main" tabindex="-1">{@render children()}</div>
	<SiteFooter store={data.store} {nav} />
</div>
<BackToTop />
<BottomNav count={data.cart.item_count} signedIn={!!data.me} />
<BagDrawer cart={data.cart} {vatNote} />
<!-- Every heart on the page submits this one form (see SaveButton). -->
<form
	id="wishlist-form"
	method="POST"
	action="/wishlist?/toggle"
	hidden
	use:enhance={() =>
		async ({ result }) => {
			if (result.type === 'failure')
				toast.error(String(result.data?.message ?? errorText('internal')));
			await invalidateAll();
		}}
></form>
<Toaster />

<style>
	.site {
		/* Where sticky side panels stop: just under the header once it has shrunk. */
		--site-sticky: 5.5rem;
		min-block-size: 100dvb;
		background: var(--bg-page);
	}
	@media (width < 48rem) {
		.site {
			padding-block-end: 4rem; /* room for the bottom bar */
		}
	}
	.site-main:focus {
		outline: none;
	}
	.skip {
		position: fixed;
		inset-block-start: 0.5rem;
		inset-inline-start: 0.5rem;
		z-index: 30;
		padding: 0.5rem 0.875rem;
		border-radius: var(--ui-radius-control);
		background: var(--ui-accent);
		color: var(--ui-on-accent);
		translate: 0 -200%;
	}
	.skip:focus-visible {
		translate: 0 0;
	}
	/* Shared by every shop page. Prefixed, so they never restyle a component's insides. */
	.site :global(.site-container) {
		box-sizing: border-box;
		inline-size: min(80rem, 100%);
		margin-inline: auto;
		padding-inline: 1rem;
	}
	.site :global(.site-display) {
		margin: 0;
		font-size: clamp(2.25rem, 6vw, 4rem);
		font-weight: 650;
		line-height: 1.04;
		letter-spacing: -0.03em;
		text-wrap: balance;
	}
	.site :global(.site-title) {
		margin: 0;
		font-size: clamp(1.5rem, 3.5vw, 2.25rem);
		font-weight: 650;
		line-height: 1.12;
		letter-spacing: -0.02em;
		text-wrap: balance;
	}
	.site :global(.site-grid) {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(min(11.5rem, 100%), 1fr));
		gap: 1rem;
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.site :global(.site-crumbs) {
		color: var(--text-secondary);
		font-size: 0.875rem;
	}
	.site :global(.site-crumbs a) {
		color: var(--brand-600);
		text-decoration: underline;
	}
	@media (width < 40rem) {
		.site :global(.site-grid) {
			grid-template-columns: repeat(2, minmax(0, 1fr));
			gap: 0.625rem;
		}
	}
</style>
