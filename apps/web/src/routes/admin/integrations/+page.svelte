<script lang="ts">
	import { page } from '$app/state';
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import {
		DeliveryTruck01FreeIcons, CreditCardFreeIcons, Message01FreeIcons,
		BubbleChatFreeIcons, Analytics01FreeIcons, LinkSquare01FreeIcons,
		CheckmarkCircle02FreeIcons
	} from '@hugeicons/core-free-icons';
	import Badge from '$lib/components/Badge.svelte';

	let { data, form } = $props();

	const KINDS = [
		{ id: 'courier', label: 'Couriers', icon: DeliveryTruck01FreeIcons, blurb: 'Who carries the parcel and collects the cash.' },
		{ id: 'payment', label: 'Payments', icon: CreditCardFreeIcons, blurb: 'How customers pay, besides cash on delivery.' },
		{ id: 'sms', label: 'Messaging', icon: Message01FreeIcons, blurb: 'Order updates that actually get read.' },
		{ id: 'chat', label: 'Chat channels', icon: BubbleChatFreeIcons, blurb: 'Where customers already message you.' },
		{ id: 'analytics', label: 'Analytics and ads', icon: Analytics01FreeIcons, blurb: 'Knowing which spend earned the order.' }
	] as const;

	const grouped = $derived(
		KINDS.map((kind) => ({ ...kind, items: data.items.filter((i) => i.kind === kind.id) })).filter(
			(k) => k.items.length
		)
	);

	// Which card has its form open. Driven by the URL so a failed save can
	// reopen the right one after a full-page post.
	const open = $derived(form?.slug ?? data.configuring);

	function configure(slug: string | null) {
		const params = new URLSearchParams(page.url.searchParams);
		if (slug) params.set('configure', slug);
		else params.delete('configure');
		goto(`?${params}`, { keepFocus: true, noScroll: true });
	}
</script>

<svelte:head><title>Integrations · {page.data.storeName ?? 'Fajr Shop'}</title></svelte:head>

<div class="flex flex-wrap items-start justify-between gap-4">
	<div>
		<h1 class="text-xl font-semibold tracking-tight">Integrations</h1>
		<p class="mt-1 max-w-2xl text-sm text-muted">
			Connect a courier, a payment provider or a chat channel. Nothing here is
			required — the shop runs on cash on delivery without any of it.
		</p>
	</div>

	<a
		href={data.showAll ? '?' : '?all=1'}
		class="btn btn-secondary"
		data-sveltekit-noscroll
	>
		{data.showAll ? 'Show only my region' : 'Show every region'}
	</a>
</div>

{#if form?.error}
	<p class="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300" role="alert">
		{form.error}
	</p>
{:else if form?.saved}
	<p class="mt-4 flex items-center gap-2 rounded-xl bg-green-50 px-3 py-2 text-sm text-green-800 dark:bg-green-950/40 dark:text-green-300" role="status">
		<HugeiconsIcon icon={CheckmarkCircle02FreeIcons} size={16} aria-hidden="true" />
		Connected. It is live on the shop now.
	</p>
{/if}

{#each grouped as group (group.id)}
	<section class="mt-10">
		<div class="flex items-center gap-2.5">
			<HugeiconsIcon icon={group.icon} size={18} aria-hidden="true" class="text-muted" />
			<h2 class="font-semibold text-strong">{group.label}</h2>
		</div>
		<p class="mt-1 text-sm text-muted">{group.blurb}</p>

		<ul class="mt-4 grid gap-3 lg:grid-cols-2">
			{#each group.items as item (item.slug)}
				<li class="rounded-3xl bg-raised p-5 elevated">
					<div class="flex items-start justify-between gap-3">
						<div class="min-w-0">
							<div class="flex flex-wrap items-center gap-2">
								<h3 class="font-medium text-strong">{item.name}</h3>
								{#if item.installed && item.enabled}
									<Badge tone="success">Connected</Badge>
								{:else if item.installed}
									<Badge tone="neutral">Paused</Badge>
								{/if}
								{#if item.status === 'coming-soon'}
									<Badge tone="warning">Coming soon</Badge>
								{/if}
							</div>
							<p class="mt-1 text-sm text-muted">{item.blurb}</p>
						</div>
					</div>

					<p class="mt-3 text-sm text-body">{item.does}</p>

					{#if item.lastError}
						<p class="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-300" role="alert">
							Last attempt failed: {item.lastError}
						</p>
					{/if}

					<div class="mt-4 flex flex-wrap items-center gap-2">
						{#if item.status === 'coming-soon'}
							<button class="btn btn-secondary" disabled>Not ready yet</button>
						{:else if open === item.slug}
							<button class="btn btn-secondary" onclick={() => configure(null)}>Cancel</button>
						{:else}
							<button class="btn btn-primary" onclick={() => configure(item.slug)}>
								{item.installed ? 'Edit settings' : 'Connect'}
							</button>
						{/if}

						{#if item.installed}
							<form method="POST" action="?/toggle" use:enhance>
								<input type="hidden" name="slug" value={item.slug} />
								<input type="hidden" name="enabled" value={item.enabled ? 'false' : 'true'} />
								<button class="btn btn-secondary">{item.enabled ? 'Pause' : 'Resume'}</button>
							</form>

							<form method="POST" action="?/uninstall" use:enhance>
								<input type="hidden" name="slug" value={item.slug} />
								<button class="btn btn-secondary">Remove</button>
							</form>
						{/if}

						{#if item.docsUrl}
							<a
								href={item.docsUrl}
								target="_blank"
								rel="noopener"
								class="ms-auto inline-flex items-center gap-1 text-sm text-muted hover:text-strong"
							>
								Get keys
								<HugeiconsIcon icon={LinkSquare01FreeIcons} size={14} aria-hidden="true" />
								<span class="sr-only">Opens in a new tab</span>
							</a>
						{/if}
					</div>

					{#if open === item.slug}
						<form method="POST" action="?/save" use:enhance class="mt-5 space-y-3 border-t border-line/60 pt-5">
							<input type="hidden" name="slug" value={item.slug} />

							{#each item.fields as field (field.key)}
								<div>
									<label class="label" for="{item.slug}-{field.key}">
										{field.label}
										{#if field.optional}<span class="font-normal text-faint">(optional)</span>{/if}
									</label>
									<input
										id="{item.slug}-{field.key}"
										name={field.key}
										type={field.secret ? 'password' : 'text'}
										value={field.secret ? '' : (item.config[field.key] ?? '')}
										placeholder={field.secret && item.config[field.key]
											? 'Saved — leave blank to keep it'
											: (field.placeholder ?? '')}
										autocomplete="off"
										class="field"
									/>
									{#if field.help}<p class="mt-1 text-xs text-faint">{field.help}</p>{/if}
								</div>
							{/each}

							<button class="btn btn-primary">
								{item.installed ? 'Save changes' : 'Connect'}
							</button>
						</form>
					{/if}
				</li>
			{/each}
		</ul>
	</section>
{/each}
