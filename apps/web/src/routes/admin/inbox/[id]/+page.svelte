<script lang="ts">
	import { page } from '$app/state';
	import { enhance } from '$app/forms';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import { WhatsappFreeIcons, Facebook01FreeIcons, BubbleChatFreeIcons, SparklesFreeIcons } from '@hugeicons/core-free-icons';
	import Badge from '$lib/components/Badge.svelte';

	let { data, form } = $props();

	const CHANNEL = { whatsapp: WhatsappFreeIcons, messenger: Facebook01FreeIcons, web: BubbleChatFreeIcons };
	const c = $derived(data.conversation);

	let draft = $state('');
	let fromSuggestion = $state(false);
	let sending = $state(false);

	// The order's own currency, not the taka the helper used to assume.
	const money = $derived((minor: number) =>
		new Intl.NumberFormat('en', {
			style: 'currency',
			currency: c.orderCurrency ?? 'BDT',
			maximumFractionDigits: 0
		}).format(minor / 100)
	);

	const when = (d: Date | string) =>
		new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Dhaka' })
			.format(new Date(d));
</script>

<svelte:head><title>{c.displayName ?? 'Conversation'} · Inbox · {page.data.storeName ?? 'Fajr Shop'}</title></svelte:head>

<a href="/admin/inbox" class="text-sm text-muted hover:text-strong">← Inbox</a>

<div class="mt-3 flex flex-wrap items-center gap-3">
	<span class="grid size-10 place-items-center rounded-xl bg-active text-muted">
		<HugeiconsIcon icon={CHANNEL[c.channel]} size={20} aria-hidden="true" />
	</span>
	<div>
		<h1 class="font-semibold tracking-tight text-strong">
			{c.displayName ?? c.phoneE164 ?? 'Unknown'}
		</h1>
		<p class="text-sm text-muted">{c.channel}{c.phoneE164 ? ` · ${c.phoneE164}` : ''}</p>
	</div>

	{#if c.orderCode}
		<a href="/admin/orders" class="ms-auto">
			<Badge tone="info">
				{c.orderCode} · {c.orderStatus} · {money(c.orderTotalMinor ?? 0)}
			</Badge>
		</a>
	{/if}

	<form method="POST" action="?/status" use:enhance class="ms-auto flex gap-2">
		<input type="hidden" name="status" value={c.status === 'closed' ? 'open' : 'closed'} />
		<button class="btn btn-secondary">{c.status === 'closed' ? 'Reopen' : 'Close'}</button>
	</form>
</div>

{#if form?.error}
	<p class="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300" role="alert">
		{form.error}
	</p>
{/if}

<ol class="mt-6 space-y-3">
	{#each c.messages as message (message.id)}
		<li class="flex {message.direction === 'out' ? 'justify-end' : 'justify-start'}">
			<div class="max-w-[36rem]">
				<div
					class="rounded-3xl px-4 py-3 text-sm {message.direction === 'out'
						? 'bg-primary-600 text-white'
						: 'bg-raised text-body elevated'}"
				>
					{message.body}
				</div>
				<p class="mt-1 flex items-center gap-2 px-1 text-xs text-faint {message.direction === 'out' ? 'justify-end' : ''}">
					{#if message.sentBy}{message.sentBy} ·{/if}
					{when(message.createdAt)}
					{#if message.wasSuggested}· suggested{/if}
					{#if message.failedReason}
						· <span class="text-red-600 dark:text-red-400">not delivered: {message.failedReason}</span>
					{/if}
				</p>
			</div>
		</li>
	{/each}
</ol>

{#if data.suggestions.length}
	<div class="mt-8">
		<p class="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-faint">
			<HugeiconsIcon icon={SparklesFreeIcons} size={14} aria-hidden="true" />
			Suggested replies
		</p>
		<!-- Drafted from this customer's own order and the shop's terms. Staff
		     send, edit or ignore — nothing goes out on its own. -->
		<ul class="mt-2 space-y-2">
			{#each data.suggestions as suggestion (suggestion.body)}
				<li>
					<button
						type="button"
						onclick={() => {
							draft = suggestion.body;
							fromSuggestion = true;
						}}
						class="w-full rounded-2xl bg-raised p-3 text-start elevated transition hover:shadow-lg"
					>
						<span class="block text-sm text-body">{suggestion.body}</span>
						<span class="mt-1 block text-xs text-faint">{suggestion.because}</span>
					</button>
				</li>
			{/each}
		</ul>
	</div>
{/if}

<form
	method="POST"
	action="?/send"
	use:enhance={() => {
		sending = true;
		return async ({ update }) => {
			await update();
			draft = '';
			fromSuggestion = false;
			sending = false;
		};
	}}
	class="mt-6 flex items-end gap-2"
>
	<input type="hidden" name="suggested" value={String(fromSuggestion)} />
	<div class="flex-1">
		<label class="sr-only" for="body">Your reply</label>
		<textarea
			id="body"
			name="body"
			rows="3"
			bind:value={draft}
			oninput={() => (fromSuggestion = false)}
			placeholder="Write a reply…"
			class="field"
		></textarea>
	</div>
	<button disabled={sending || !draft.trim()} class="btn btn-primary">
		{sending ? 'Sending…' : 'Send'}
	</button>
</form>
