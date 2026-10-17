<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import {
		Activity01Icon,
		BubbleChatQuestionIcon,
		StarIcon,
		DashboardSquare01Icon,
		DeliveryTruck01Icon,
		DiscountTag01Icon,
		Folder01Icon,
		Image01Icon,
		Key01Icon,
		PackageIcon,
		Store01Icon
	} from '@hugeicons/core-free-icons';
	import { nav } from '#lib/copy.js';
	import Button from '#lib/sinaui/ui/Button.svelte';
	import SidebarLayout, { type SidebarGroup } from '#lib/sinaui/ui/SidebarLayout.svelte';
	import { Toaster } from '#lib/sinaui/ui/toast/index.js';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();

	const groups: SidebarGroup[] = [
		{ items: [{ label: nav.overview, href: '/admin', icon: DashboardSquare01Icon }] },
		{
			title: nav.catalog,
			items: [
				{ label: nav.products, href: '/admin/products', icon: PackageIcon },
				{ label: nav.categories, href: '/admin/categories', icon: Folder01Icon },
				{ label: nav.banners, href: '/admin/banners', icon: Image01Icon },
				{ label: nav.reviews, href: '/admin/reviews', icon: StarIcon },
				{ label: nav.questions, href: '/admin/questions', icon: BubbleChatQuestionIcon }
			]
		},
		{
			title: nav.shop,
			items: [
				{ label: nav.storeSettings, href: '/admin/settings/store', icon: Store01Icon },
				{ label: nav.shipping, href: '/admin/shipping', icon: DeliveryTruck01Icon },
				{ label: nav.discounts, href: '/admin/discounts', icon: DiscountTag01Icon },
				{ label: nav.activity, href: '/admin/activity', icon: Activity01Icon }
			]
		},
		{
			title: nav.developers,
			items: [{ label: nav.apiKeys, href: '/admin/settings/api-keys', icon: Key01Icon }]
		}
	];

	// The section being shown, so a product's own page still highlights "Products".
	const current = $derived(
		groups
			.flatMap((g) => g.items)
			.find(
				(i) =>
					page.url.pathname === i.href ||
					(i.href !== '/admin' && page.url.pathname.startsWith(i.href + '/'))
			)?.href
	);

	let signingOut = $state(false);
	async function signOut() {
		signingOut = true;
		await fetch('/admin/session', { method: 'DELETE' });
		await goto('/admin/login', { invalidateAll: true });
	}
</script>

<svelte:head><meta name="robots" content="noindex" /></svelte:head>

<!-- The full window: the sidebar runs top to bottom and the content scrolls on its own. -->
<div class="frame">
	<SidebarLayout label={nav.label} {groups} {current} persist="fs-admin-sidebar">
		{#snippet header(collapsed)}
			<span class="shop">{collapsed ? data.store.name.slice(0, 1) : data.store.name}</span>
		{/snippet}
		{#snippet footer()}
			<div class="me">
				<span>{data.user.name}</span>
				<Button variant="ghost" size="sm" loading={signingOut} onclick={signOut}
					>{nav.signOut}</Button
				>
			</div>
		{/snippet}
		<div class="page" id="main" role="main">{@render children()}</div>
	</SidebarLayout>
</div>
<Toaster />

<style>
	.frame {
		block-size: 100dvh;
	}
	.shop {
		font-weight: 600;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.me {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
		font-size: 0.875rem;
	}
	.me span {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.page {
		box-sizing: border-box;
		inline-size: 100%;
		max-inline-size: 100rem;
		padding: 1.75rem 2rem 4rem;
	}
	/* Shared by every dashboard page, so they all read alike. */
	.page :global(.head) {
		display: flex;
		flex-wrap: wrap;
		align-items: start;
		justify-content: space-between;
		gap: 1rem;
		margin-block-end: 1.5rem;
	}
	.page :global(.head h1) {
		margin: 0 0 0.25rem;
		font-size: 1.5rem;
	}
	/* A header with no actions: title, then the description under it. */
	.page :global(.head > h1:has(+ p)),
	.page :global(.head > p) {
		flex-basis: 100%;
	}
	.page :global(.head > p) {
		margin-block-start: -1rem;
	}
	.page :global(.head p) {
		margin: 0;
		max-inline-size: 48rem;
		color: var(--ui-muted);
	}
	/* A form beside the list it adds to. */
	.page :global(.split) {
		display: grid;
		grid-template-columns: minmax(20rem, 26rem) minmax(0, 1fr);
		align-items: start;
		gap: 1.5rem;
	}
	@media (width < 64rem) {
		.page {
			padding: 1.25rem 1rem 3rem;
		}
		.page :global(.split) {
			grid-template-columns: minmax(0, 1fr);
		}
	}
</style>
