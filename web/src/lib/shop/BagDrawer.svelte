<script lang="ts">
	import { ShoppingBag02Icon } from '@hugeicons/core-free-icons';
	import Icon from '#lib/sinaui/ui/Icon.svelte';
	import type { components } from '#lib/api.js';
	import { cart as t } from '#lib/copy.js';
	import { formatMoney } from '#lib/money.js';
	import Button from '#lib/sinaui/ui/Button.svelte';
	import Dialog from '#lib/sinaui/ui/Dialog.svelte';
	import RollingNumber from '#lib/sinaui/ui/RollingNumber.svelte';
	import { bag } from './bag.svelte';
	import CartLines from './CartLines.svelte';

	let { cart, vatNote }: { cart: components['schemas']['Cart']; vatNote?: string } = $props();
	const close = () => (bag.open = false);
</script>

<Dialog bind:open={bag.open} side="end" title={t.bag} class="bag">
	{#if cart.items.length}
		<CartLines items={cart.items} onnavigate={close} />
	{:else}
		<div class="empty">
			<span class="mark" aria-hidden="true"><Icon icon={ShoppingBag02Icon} size={22} /></span>
			<p>{t.empty}</p>
			<Button variant="secondary" href="/shop" onclick={close}>{t.browse}</Button>
		</div>
	{/if}

	{#snippet footer()}
		{#if cart.items.length}
			<div class="foot">
				<p class="sub">
					<span>{t.subtotal(cart.item_count)}</span>
					<strong><RollingNumber value={formatMoney(cart.subtotal)} /></strong>
				</p>
				{#if cart.discount?.applies && cart.discount_total}
					<p class="sub">
						<span>{t.discountLine(cart.discount.code)}</span>
						<strong>−{formatMoney(cart.discount_total)}</strong>
					</p>
				{/if}
				<p class="note">{vatNote ? `${vatNote} ` : ''}{t.note}</p>
				<Button size="lg" href="/cart" onclick={close}>{t.viewBag}</Button>
			</div>
		{/if}
	{/snippet}
</Dialog>

<style>
	:global(.dialog.bag) {
		inline-size: min(26rem, 100vw);
	}
	.empty {
		display: grid;
		justify-items: center;
		gap: 0.75rem;
		padding-block: 2rem;
		color: var(--ui-muted);
		text-align: center;
	}
	.empty p {
		margin: 0;
	}
	.mark {
		display: grid;
		place-items: center;
		inline-size: 3rem;
		block-size: 3rem;
		border-radius: 50%;
		background: var(--ui-subtle);
	}
	.foot {
		display: grid;
		gap: 0.5rem;
		inline-size: 100%;
	}
	.sub {
		display: flex;
		justify-content: space-between;
		margin: 0;
		font-variant-numeric: tabular-nums;
	}
	.note {
		margin: 0 0 0.25rem;
		color: var(--ui-muted);
		font-size: 0.8125rem;
	}
</style>
