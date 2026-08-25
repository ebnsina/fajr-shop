<script lang="ts">
	import { page } from '$app/state';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import { WhatsappFreeIcons, Facebook01FreeIcons, BubbleChatFreeIcons } from '@hugeicons/core-free-icons';
	import Badge from '$lib/components/Badge.svelte';

	let { data } = $props();

	const CHANNEL = { whatsapp: WhatsappFreeIcons, messenger: Facebook01FreeIcons, web: BubbleChatFreeIcons };

	// Relative time reads better than a timestamp in a list you scan.
	const rel = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
	function ago(d: Date | string) {
		const seconds = (Date.now() - new Date(d).getTime()) / 1000;
		const steps: [number, Intl.RelativeTimeFormatUnit][] = [
			[60, 'second'], [3600, 'minute'], [86400, 'hour'], [604800, 'day']
		];
		let previous = 1;
		for (const [limit, unit] of steps) {
			if (seconds < limit) return rel.format(-Math.floor(seconds / previous), unit);
			previous = limit;
		}
		return rel.format(-Math.floor(seconds / 604800), 'week');
	}

	const TABS = [
		{ id: 'open', label: 'Open' },
		{ id: 'snoozed', label: 'Snoozed' },
		{ id: 'closed', label: 'Closed' }
	];
</script>

<svelte:head><title>Inbox · {page.data.storeName ?? 'Fajr Shop'}</title></svelte:head>

<div class="flex flex-wrap items-start justify-between gap-4">
	<div>
		<h1 class="text-xl font-semibold tracking-tight">Inbox</h1>
		<p class="mt-1 text-sm text-muted">
			WhatsApp and Messenger in one place, so the same customer is never answered twice.
		</p>
	</div>
</div>

{#if data.channels.length === 0}
	<p class="mt-6 rounded-3xl border border-dashed border-line/60 p-8 text-center text-sm text-muted">
		No chat channel is connected yet.
		<a href="/admin/integrations" class="text-primary-600 hover:underline">Connect WhatsApp or Messenger</a>
		and messages will arrive here.
	</p>
{/if}

<div class="mt-6 flex flex-wrap items-center gap-2 border-b border-line/60 pb-3">
	{#each TABS as tab (tab.id)}
		<a
			href="?status={tab.id}"
			aria-current={data.status === tab.id ? 'page' : undefined}
			class="rounded-lg px-3 py-1.5 text-sm transition {data.status === tab.id
				? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
				: 'text-muted hover:bg-active'}"
		>
			{tab.label}
		</a>
	{/each}
</div>

{#if data.threads.length === 0}
	<p class="mt-8 rounded-3xl border border-dashed border-line/60 p-10 text-center text-sm text-muted">
		Nothing {data.status} right now.
	</p>
{:else}
	<ul class="mt-4 space-y-2">
		{#each data.threads as item (item.id)}
			<li>
				<a
					href="/admin/inbox/{item.id}"
					class="flex items-start gap-3 rounded-3xl bg-raised p-4 elevated transition hover:shadow-lg"
				>
					<span class="mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl bg-active text-muted">
						<HugeiconsIcon icon={CHANNEL[item.channel]} size={18} aria-hidden="true" />
					</span>

					<span class="min-w-0 flex-1">
						<span class="flex flex-wrap items-center gap-2">
							<strong class="text-sm text-strong">
								{item.displayName ?? item.phoneE164 ?? 'Unknown'}
							</strong>
							{#if item.orderCode}
								<Badge tone="info">{item.orderCode} · {item.orderStatus}</Badge>
							{/if}
							{#if item.unreadCount > 0}
								<Badge tone="warning">{item.unreadCount} new</Badge>
							{/if}
							<span class="ms-auto text-xs text-faint">{ago(item.lastMessageAt)}</span>
						</span>
						<span class="mt-1 block truncate text-sm text-muted">
							{item.lastMessagePreview ?? '—'}
						</span>
					</span>
				</a>
			</li>
		{/each}
	</ul>
{/if}
