<script lang="ts">
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import {
		Analytics01FreeIcons,
		BubbleChatFreeIcons,
		Plug01FreeIcons,
		LinkSquare01FreeIcons,
		DashboardSquare01FreeIcons,
		File01FreeIcons,
		FolderLibraryFreeIcons,
		Image01FreeIcons,
		LayoutLeftFreeIcons,
		Logout01FreeIcons,
		Menu01FreeIcons,
		PackageOpenFreeIcons,
		Settings01FreeIcons,
		ShoppingBag01FreeIcons,
		UserMultipleFreeIcons
	} from '@hugeicons/core-free-icons';
	import { page } from '$app/state';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';
	import LocaleToggle from '$lib/components/LocaleToggle.svelte';
	import { m } from '$lib/paraglide/messages';

	let { data, children } = $props();

	let mobileOpen = $state(false);

	const storeName = $derived(data.storeName || 'Fajr Shop');
	const storeInitial = $derived(storeName.trim().charAt(0).toUpperCase() || 'F');

	// Grouped by the job being done, not by data model.
	const GROUPS = [
		{
			label: null,
			items: [{ href: '/admin', label: m.nav_dashboard(), icon: DashboardSquare01FreeIcons, permission: null }]
		},
		{
			label: m.nav_group_selling(),
			items: [
				{ href: '/admin/orders', label: m.nav_orders(), icon: ShoppingBag01FreeIcons, permission: 'order.read' },
				{ href: '/admin/customers', label: m.nav_customers(), icon: UserMultipleFreeIcons, permission: 'customer.read' },
				{ href: '/admin/reports', label: m.nav_reports(), icon: Analytics01FreeIcons, permission: 'report.read' }
			]
		},
		{
			label: m.nav_group_catalog(),
			items: [
				{ href: '/admin/products', label: m.nav_products(), icon: PackageOpenFreeIcons, permission: 'catalog.read' },
				{ href: '/admin/categories', label: m.nav_categories(), icon: FolderLibraryFreeIcons, permission: 'catalog.read' },
				{ href: '/admin/media', label: m.nav_media(), icon: Image01FreeIcons, permission: 'catalog.read' },
				{ href: '/admin/reviews', label: m.nav_reviews(), icon: BubbleChatFreeIcons, permission: 'catalog.write' }
			]
		},
		{
			label: m.nav_group_storefront(),
			items: [
				{ href: '/admin/pages', label: m.nav_pages(), icon: File01FreeIcons, permission: 'cms.read' },
				{ href: '/admin/navigation', label: m.nav_navigation(), icon: LayoutLeftFreeIcons, permission: 'cms.read' }
			]
		},
		{
			label: m.nav_group_setup(),
			items: [
				{ href: '/admin/integrations', label: m.nav_integrations(), icon: Plug01FreeIcons, permission: 'setting.write' },
				{ href: '/admin/settings', label: m.nav_settings(), icon: Settings01FreeIcons, permission: 'setting.write' }
			]
		}
	];

	const can = (permission: string | null) =>
		!permission ||
		data.staff?.permissions.includes('*') ||
		data.staff?.permissions.includes(permission);

	// A group with nothing the staff member may see is a heading over an empty
	// space, so it is dropped entirely rather than rendered bare.
	const groups = $derived(
		GROUPS.map((g) => ({ ...g, items: g.items.filter((i) => can(i.permission)) })).filter(
			(g) => g.items.length > 0
		)
	);

	const isCurrent = (href: string) =>
		href === '/admin' ? page.url.pathname === '/admin' : page.url.pathname.startsWith(href);

	const initials = $derived(
		(data.staff?.name ?? '?')
			.split(' ')
			.slice(0, 2)
			.map((w) => w[0])
			.join('')
			.toUpperCase()
	);
</script>

<svelte:head>
	<!-- Applied before first paint, or every reload flashes white. -->
	{@html `<script>try{var m=localStorage.getItem('admin-theme');if(m)document.documentElement.setAttribute('data-theme',m)}catch(e){}</script>`}
</svelte:head>

{#if page.url.pathname === '/admin/login'}
	{@render children()}
{:else}
	<div class="min-h-dvh bg-sunken font-sans text-body antialiased">
		<!-- Fixed: the sidebar never scrolls with the content. Only its own nav
		     list scrolls, if a merchant ever has more sections than fit. -->
		<aside
			class="fixed inset-y-0 start-0 z-40 flex w-60 flex-col gap-1 p-2 transition-transform lg:translate-x-0
			       {mobileOpen ? 'translate-x-0 bg-base elevated-lg' : '-translate-x-full rtl:translate-x-full'}"
		>
			<a href="/admin" class="mb-1 flex items-center gap-3 rounded-xl px-2.5 py-2">
				<span class="grid size-7 shrink-0 place-items-center rounded-lg bg-primary-600 text-xs font-semibold text-white">
					{storeInitial}
				</span>
				<span class="truncate font-semibold tracking-tight text-strong">{storeName}</span>
			</a>

			<!-- Staff check the shop constantly; a new tab keeps the admin where it was. -->
			<a
				href="/"
				target="_blank"
				rel="noopener"
				class="mb-1 flex items-center gap-3 rounded-xl px-2.5 py-2 text-sm text-muted transition hover:bg-hover hover:text-strong"
			>
				<span class="flex w-7 shrink-0 justify-center" aria-hidden="true">
					<HugeiconsIcon icon={LinkSquare01FreeIcons} size={18} strokeWidth={1.75} />
				</span>
				{m.nav_visit_site()}
				<span class="sr-only">{m.nav_opens_new_tab()}</span>
			</a>

			<nav class="flex flex-1 flex-col gap-4 overflow-y-auto" aria-label={m.nav_sections()}>
				{#each groups as group (group.label ?? 'main')}
					<!-- Each group is its own labelled list, so a screen reader
					     announces "Selling, list, 3 items" instead of one flat run. -->
					<div>
						{#if group.label}
							<h2
								id="navgroup-{group.label}"
								class="px-2.5 pb-1.5 text-xs font-medium uppercase tracking-wide text-faint"
							>
								{group.label}
							</h2>
						{/if}
						<ul
							class="flex flex-col gap-0.5"
							aria-labelledby={group.label ? `navgroup-${group.label}` : undefined}
						>
							{#each group.items as item (item.href)}
								<li>
									<a
										href={item.href}
										onclick={() => (mobileOpen = false)}
										aria-current={isCurrent(item.href) ? 'page' : undefined}
										class="flex items-center gap-3 rounded-xl px-2.5 py-2 text-sm transition
										       hover:bg-hover aria-[current=page]:bg-raised aria-[current=page]:font-medium
										       aria-[current=page]:text-strong aria-[current=page]:elevated"
									>
										<span class="flex w-7 shrink-0 justify-center" aria-hidden="true">
											<HugeiconsIcon icon={item.icon} size={18} strokeWidth={1.75} />
										</span>
										{item.label}
									</a>
								</li>
							{/each}
						</ul>
					</div>
				{/each}
			</nav>

			<div class="mt-1 rounded-xl px-2.5 py-1.5">
				<div class="flex items-center gap-2">
				<span class="grid size-7 shrink-0 place-items-center rounded-full bg-active text-xs font-medium text-strong">
					{initials}
				</span>
					<div class="min-w-0 flex-1">
						<p class="truncate text-sm font-medium text-strong">{data.staff?.name}</p>
						<p class="truncate text-xs text-muted">{data.staff?.roleId}</p>
					</div>
				</div>

				<div class="mt-1.5 flex items-center gap-1">
					<LocaleToggle />
					<ThemeToggle />
					<form method="POST" action="/admin/logout" class="ms-auto">
						<button class="btn btn-ghost !px-2" aria-label={m.nav_sign_out()} title={m.nav_sign_out()}>
							<HugeiconsIcon icon={Logout01FreeIcons} size={16} strokeWidth={1.75} />
						</button>
					</form>
				</div>
			</div>
		</aside>

		{#if mobileOpen}
			<button
				class="fixed inset-0 z-30 bg-black/30 lg:hidden"
				onclick={() => (mobileOpen = false)}
				aria-label="Close menu"
			></button>
		{/if}

		<!-- Inset panel. It owns the scroll, so the sidebar stays put. -->
		<div class="lg:ps-60">
			<main class="h-dvh p-2 lg:ps-0">
				<div class="flex h-full flex-col overflow-hidden rounded-3xl bg-raised elevated">
					<div class="flex items-center gap-3 px-4 py-3 lg:hidden">
						<button class="btn btn-ghost !px-2" onclick={() => (mobileOpen = true)} aria-label="Open menu">
							<HugeiconsIcon icon={Menu01FreeIcons} size={20} strokeWidth={1.75} />
						</button>
						<span class="truncate font-semibold text-strong">{storeName}</span>
					</div>

					<div class="flex-1 overflow-y-auto p-6 lg:p-8">
						{@render children()}
					</div>
				</div>
			</main>
		</div>
	</div>
{/if}
