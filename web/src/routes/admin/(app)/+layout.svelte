<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import {
		Activity01Icon,
		Folder01Icon,
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
		{
			title: nav.catalog,
			items: [
				{ label: nav.products, href: '/admin/products', icon: PackageIcon },
				{ label: nav.categories, href: '/admin/categories', icon: Folder01Icon }
			]
		},
		{
			title: nav.shop,
			items: [
				{ label: nav.storeSettings, href: '/admin/settings/store', icon: Store01Icon },
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
			.find((i) => page.url.pathname === i.href || page.url.pathname.startsWith(i.href + '/'))?.href
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
		inline-size: min(48rem, 100%);
		padding: 1.5rem 1rem 3rem;
	}
</style>
