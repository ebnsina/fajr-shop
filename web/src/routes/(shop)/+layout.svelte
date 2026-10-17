<script lang="ts">
	import { cart as c, shop as t } from '#lib/copy.js';
	import { Toaster } from '#lib/sinaui/ui/toast/index.js';
	import BagDrawer from '#lib/shop/BagDrawer.svelte';
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
	<SiteHeader store={data.store} {nav} count={data.cart.item_count} />
	<div id="main" class="site-main" role="main" tabindex="-1">{@render children()}</div>
	<SiteFooter store={data.store} {nav} />
</div>
<BagDrawer cart={data.cart} {vatNote} />
<Toaster />

<style>
	.site {
		min-block-size: 100dvb;
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
		inline-size: min(76rem, 100%);
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
		grid-template-columns: repeat(auto-fill, minmax(min(14rem, 100%), 1fr));
		gap: 2rem 1.25rem;
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.site :global(.site-crumbs) {
		color: var(--ui-muted);
		font-size: 0.875rem;
	}
	.site :global(.site-crumbs a) {
		color: inherit;
	}
	@media (width < 40rem) {
		.site :global(.site-grid) {
			grid-template-columns: repeat(2, minmax(0, 1fr));
			gap: 1.5rem 0.75rem;
		}
	}
</style>
