<script lang="ts">
	import { page } from '$app/state';
	import { enhance } from '$app/forms';
	import { minorToTaka } from '@fajr/schemas';
	import Badge from '$lib/components/Badge.svelte';
	import { ORDER_TONE, RISK_TONE } from '$lib/status';
	import { adminMoney } from '$lib/adminMoney';

	let { data, form } = $props();
	const o = $derived(data.order);

	const taka = (m: number) => adminMoney(m);
	const when = (d: Date | string) =>
		new Intl.DateTimeFormat('en-GB', {
			day: 'numeric', month: 'short', year: 'numeric',
			hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Dhaka'
		}).format(new Date(d));

	const owed = $derived(o.totalMinor - o.paidMinor);

	const pendingPayments = $derived(o.payments.filter((p) => p.status === 'verifying'));
	const isOpen = $derived(!['cancelled', 'delivered', 'returned'].includes(o.status));

	const card = 'card';
	const btn = 'btn btn-secondary';
</script>

<svelte:head><title>{o.publicCode} · Orders · {page.data.storeName ?? 'Fajr Shop'}</title></svelte:head>

<div class="flex flex-wrap items-start justify-between gap-4">
	<div>
		<a href="/admin/orders" class="text-sm text-muted hover:text-strong">← Orders</a>
		<h1 class="mt-1 flex items-center gap-3 text-xl font-semibold tracking-tight">
			{o.publicCode}
			<Badge tone={ORDER_TONE[o.status] ?? 'neutral'}>{o.status}</Badge>
		</h1>
		<p class="mt-1 text-sm text-muted">{when(o.placedAt)} · {o.paymentMethod.replace('_', ' ')}</p>
	</div>

	<div class="flex flex-wrap gap-2">
		<a href="/admin/orders/{o.id}/invoice" target="_blank" rel="noopener" class={btn}>Invoice</a>
		{#if isOpen}
			{#if o.status === 'confirmed' || o.status === 'processing'}
				<form method="POST" action="?/ship" use:enhance class="flex items-center gap-2">
					<select name="courier" class="field !w-auto !py-1.5" title="Ranked by delivery success in this area">
						{#each data.couriers as c, i (c.courier)}
							<option value={c.courier}>
								{c.courier}
								{i === 0 ? '· best here' : ''}
								({Math.round(c.successRate * 100)}%)
							</option>
						{/each}
					</select>
					<button class="btn btn-primary">Send to courier</button>
				</form>
			{/if}
			{#if o.status === 'shipped'}
				<form method="POST" action="?/deliver" use:enhance>
					<button class="btn btn-primary !bg-green-600 hover:!bg-green-700">Mark delivered</button>
				</form>
			{/if}
		{/if}
	</div>
</div>

{#if form?.error}
	<p class="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{form.error}</p>
{/if}

<div class="mt-6 grid gap-6 lg:grid-cols-3">
	<div class="space-y-6 lg:col-span-2">
		<!-- verification queue: the BD workflow that decides whether this ships -->
		{#if isOpen}
			<section class={card}>
				<div class="flex flex-wrap items-center justify-between gap-2">
					<h2 class="text-sm font-medium text-body">Verification call</h2>
					<div class="flex items-center gap-2">
						{#if o.riskBand}
							<span title="Courier return history at the time this order was placed">
								<Badge tone={RISK_TONE[o.riskBand] ?? 'neutral'}>
									risk {o.riskBand}{#if o.riskScore !== null} · {o.riskScore}{/if}
								</Badge>
							</span>
						{/if}
						<span class="text-xs text-muted">{o.verificationStatus}</span>
					</div>
				</div>

				<p class="mt-2 text-sm">
					<a href="tel:{o.phoneE164}" class="font-medium text-primary-600">{o.phoneE164}</a>
				</p>

				<form method="POST" action="?/verify" use:enhance class="mt-3 flex flex-wrap items-center gap-2">
					<input name="note" placeholder="What did they say?" class="min-w-48 flex-1 field !py-1.5" />
					<button name="status" value="confirmed" class="btn btn-primary !bg-green-600 hover:!bg-green-700">Confirmed</button>
					<button name="status" value="unreachable" class={btn}>No answer</button>
					<button name="status" value="cancelled" class="btn btn-danger">Cancel order</button>
				</form>
			</section>
		{/if}

		<!-- items -->
		<section class={card}>
			<h2 class="mb-3 text-sm font-medium text-body">Items</h2>
			<table class="w-full text-sm">
				<tbody class="divide-y divide-line/50">
					{#each o.items as item (item.id)}
						<tr>
							<td class="py-2">
								{item.title}
								{#if item.variantTitle}<span class="text-muted"> · {item.variantTitle}</span>{/if}
								{#if item.sku}<span class="ms-2 text-xs text-faint">{item.sku}</span>{/if}
							</td>
							<td class="py-2 text-end tabular-nums text-muted">{item.qty} × {taka(item.unitPriceMinor)}</td>
							<td class="py-2 text-end tabular-nums">{taka(item.totalMinor)}</td>
						</tr>
					{/each}
				</tbody>
				<tfoot class="border-t border-line/60">
					<tr><td class="py-2" colspan="2">Subtotal</td><td class="py-2 text-end tabular-nums">{taka(o.subtotalMinor)}</td></tr>
					<tr><td class="py-1" colspan="2">Delivery</td><td class="py-1 text-end tabular-nums">{taka(o.shippingMinor)}</td></tr>
					<tr class="font-medium"><td class="py-2" colspan="2">Total</td><td class="py-2 text-end tabular-nums">{taka(o.totalMinor)}</td></tr>
					{#if o.paidMinor > 0}
						<tr class="text-green-700"><td class="py-1" colspan="2">Paid</td><td class="py-1 text-end tabular-nums">−{taka(o.paidMinor)}</td></tr>
						<tr class="font-medium"><td class="py-1" colspan="2">Due on delivery</td><td class="py-1 text-end tabular-nums">{taka(owed)}</td></tr>
					{/if}
				</tfoot>
			</table>
		</section>

		<!-- payments -->
		<section class={card}>
			<h2 class="mb-3 text-sm font-medium text-body">Payments</h2>

			{#if o.payments.length === 0}
				<p class="text-sm text-muted">Nothing recorded yet.</p>
			{:else}
				<ul class="divide-y divide-line/50 text-sm">
					{#each o.payments as p (p.id)}
						<li class="flex flex-wrap items-center gap-3 py-2">
							<span class="font-medium">{taka(p.amountMinor)}</span>
							<span class="text-muted">{p.provider.replace('_', ' ')}</span>
							{#if p.reference}<code class="rounded bg-active px-1.5 py-0.5 text-xs">{p.reference}</code>{/if}
							<span class="text-xs {p.status === 'succeeded' ? 'text-green-700' : 'text-amber-700'}">{p.status}</span>

							{#if p.status === 'verifying'}
								<form method="POST" action="?/payment" use:enhance class="ms-auto">
									<input type="hidden" name="paymentId" value={p.id} />
									<button class="btn btn-primary !bg-strong !text-raised !py-1 !text-xs">Confirm received</button>
								</form>
							{/if}
						</li>
					{/each}
				</ul>
			{/if}

			{#if pendingPayments.length}
				<p class="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
					Check the bKash app before confirming — a transaction ID alone proves nothing.
				</p>
			{/if}

			<form method="POST" action="?/payment" use:enhance class="mt-3 flex flex-wrap gap-2">
				<input name="reference" placeholder="bKash transaction ID" class="min-w-40 flex-1 field !py-1.5" />
				<input name="amountMinor" type="number" min="1" value={o.advanceMinor || o.totalMinor} class="w-28 field !py-1.5 tabular-nums" />
				<button class={btn}>Record</button>
			</form>
			<p class="mt-1 text-xs text-muted">Amount in poisha — {taka(o.advanceMinor || o.totalMinor)}.</p>
		</section>

		<!-- parcels -->
		{#if data.shipments.length}
			<section class={card}>
				<h2 class="mb-3 text-sm font-medium text-body">Parcels</h2>
				<ul class="divide-y divide-line/50 text-sm">
					{#each data.shipments as s (s.id)}
						<li class="flex flex-wrap items-center gap-3 py-2">
							<span class="font-medium">{s.courier}</span>
							{#if s.consignmentId}
								<code class="rounded-lg bg-active px-1.5 py-0.5 font-mono text-xs">{s.consignmentId}</code>
							{/if}
							<span class="text-xs text-muted">{s.status.replace('_', ' ')}</span>
							{#if s.codAmountMinor > 0}
								<span class="text-xs text-muted">collect {taka(s.codAmountMinor)}</span>
							{/if}
							{#if s.codSettledAt}
								<span class="text-xs text-green-700 dark:text-green-400">COD settled</span>
							{:else if s.status === 'delivered'}
								<span class="text-xs text-amber-700 dark:text-amber-400">COD outstanding</span>
							{/if}

							<form method="POST" action="?/track" use:enhance class="ms-auto">
								<input type="hidden" name="shipmentId" value={s.id} />
								<button class="btn btn-ghost !px-2 !text-xs">Refresh</button>
							</form>
						</li>
					{/each}
				</ul>
			</section>
		{/if}

		<!-- timeline -->
		<section class={card}>
			<h2 class="mb-3 text-sm font-medium text-body">Timeline</h2>
			<ol class="space-y-3 text-sm">
				{#each o.events as e (e.id)}
					<li class="flex gap-3">
						<span class="mt-1.5 size-1.5 shrink-0 rounded-full bg-neutral-300"></span>
						<div>
							<p>{e.type}{#if e.message}<span class="text-muted"> · {e.message}</span>{/if}</p>
							<p class="text-xs text-faint">{when(e.createdAt)} · {e.actorType}</p>
						</div>
					</li>
				{/each}
			</ol>
		</section>
	</div>

	<!-- sidebar -->
	<div class="space-y-6">
		<section class={card}>
			<h2 class="mb-2 text-sm font-medium text-body">Deliver to</h2>
			{#if o.address}
				<address class="text-sm not-italic leading-relaxed">
					<strong>{o.address.name}</strong><br />
					<a href="tel:{o.address.phoneE164}" class="text-primary-600">{o.address.phoneE164}</a><br />
					{o.address.detail}<br />
					{[o.address.area, o.address.thana, o.address.district].filter(Boolean).join(', ')}
				</address>
			{/if}
			{#if o.note}
				<p class="mt-3 rounded-lg bg-hover px-3 py-2 text-sm">
					<span class="text-xs text-muted">Customer note</span><br />{o.note}
				</p>
			{/if}
		</section>

		<section class={card}>
			<h2 class="mb-2 text-sm font-medium text-body">Staff note</h2>
			<form method="POST" action="?/note" use:enhance>
				<textarea name="staffNote" rows="3" class="field">{o.staffNote ?? ''}</textarea>
				<button class="{btn} mt-2 w-full">Save note</button>
			</form>
		</section>

		{#if isOpen}
			<form method="POST" action="?/cancel" use:enhance class={card}>
				<h2 class="mb-2 text-sm font-medium text-body">Cancel order</h2>
				<input name="reason" placeholder="Reason" class="w-full field !py-1.5" />
				<button class="mt-2 w-full btn btn-danger">
					Cancel and return stock
				</button>
			</form>
		{/if}
	</div>
</div>
