<script lang="ts">
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import type { components } from '#lib/api.js';
	import { cart as t } from '#lib/copy.js';
	import { formatMoney } from '#lib/money.js';
	import Button from '#lib/sinaui/ui/Button.svelte';
	import { pop, reflow } from '#lib/sinaui/ui/motion.js';
	import RollingNumber from '#lib/sinaui/ui/RollingNumber.svelte';
	import { toast } from '#lib/sinaui/ui/toast/index.js';
	import ProductImage from './ProductImage.svelte';

	// The bag's lines. Each change is a small form, so it works before (and without) JavaScript.
	let {
		items,
		onnavigate
	}: { items: components['schemas']['CartItem'][]; onnavigate?: () => void } = $props();

	const optionText = (o: Record<string, string>) => Object.values(o).join(' / ');
	const update = () => {
		return async ({
			result,
			update
		}: {
			result: { type: string; data?: Record<string, unknown> };
			update: () => Promise<void>;
		}) => {
			if (result.type === 'failure') toast.error(String(result.data?.message ?? ''));
			await update();
		};
	};
</script>

<ul class="lines">
	{#each items as item (item.variant_id)}
		<li animate:reflow in:pop out:pop>
			<span class="thumb"><ProductImage src={item.image?.url} alt="" ratio="1" icon={20} /></span>
			<div class="info">
				<a href="/p/{item.slug}" onclick={onnavigate}>{item.name}</a>
				{#if Object.keys(item.options).length}<span class="opt">{optionText(item.options)}</span
					>{/if}
				<form
					method="POST"
					action="/cart?/set"
					use:enhance={update}
					class="qty"
					aria-label={t.quantityOf(item.name)}
				>
					<input type="hidden" name="variant" value={item.variant_id} />
					<button
						name="quantity"
						value={item.quantity - 1}
						aria-label={t.fewer}
						disabled={item.quantity <= 1}>−</button
					>
					<span aria-live="polite"><RollingNumber value={item.quantity} /></span>
					<button
						name="quantity"
						value={item.quantity + 1}
						aria-label={t.more}
						disabled={item.quantity >= item.stock}>+</button
					>
				</form>
				{#if !item.purchasable}
					<span class="warn">
						{item.stock === 0
							? t.soldOut
							: item.stock < item.quantity
								? t.onlyLeft(item.stock)
								: t.unavailable}
					</span>
				{:else if item.quantity >= item.stock}
					<span class="opt">{t.allWeHave}</span>
				{/if}
			</div>
			<div class="end">
				<span class={['amount', !item.purchasable && 'struck']}>{formatMoney(item.line_total)}</span
				>
				<form method="POST" action="/cart?/set" use:enhance={update}>
					<input type="hidden" name="variant" value={item.variant_id} />
					<Button
						type="submit"
						name="quantity"
						value="0"
						variant="ghost"
						size="sm"
						square
						aria-label={t.remove(item.name)}
					>
						<Trash2 size={16} />
					</Button>
				</form>
			</div>
		</li>
	{/each}
</ul>

<style>
	.lines {
		display: grid;
		gap: 0.75rem;
		margin: 0;
		padding: 0;
		list-style: none;
	}
	li {
		display: grid;
		grid-template-columns: 4rem minmax(0, 1fr) auto;
		gap: 0.75rem;
		align-items: start;
	}
	.thumb {
		display: block;
		inline-size: 4rem;
	}
	.info {
		display: grid;
		gap: 0.25rem;
		min-inline-size: 0;
	}
	.info a {
		color: var(--ui-fg);
		font-weight: 600;
		text-decoration: none;
	}
	.opt {
		color: var(--ui-muted);
		font-size: 0.8125rem;
	}
	.warn {
		color: var(--ui-warning);
		font-size: 0.8125rem;
		font-weight: 500;
	}
	.qty {
		display: inline-flex;
		align-items: center;
		justify-self: start;
		gap: 0.25rem;
		margin-block-start: 0.25rem;
		padding: 0.125rem;
		border-radius: var(--ui-radius-control);
		background: var(--ui-subtle);
		font-variant-numeric: tabular-nums;
	}
	.qty span {
		min-inline-size: 1.5rem;
		text-align: center;
	}
	.qty button {
		inline-size: 1.75rem;
		block-size: 1.75rem;
		border: 0;
		border-radius: calc(var(--ui-radius-control) - 0.125rem);
		background: none;
		color: var(--ui-fg);
		font: 600 1rem var(--ui-font);
		cursor: pointer;
	}
	.qty button:hover:not(:disabled) {
		background: var(--ui-hover);
	}
	.qty button:disabled {
		color: var(--ui-muted);
		opacity: 0.5;
		cursor: not-allowed;
	}
	.qty button:focus-visible,
	.info a:focus-visible {
		outline: var(--ui-ring-width) solid var(--ui-ring);
		outline-offset: var(--ui-ring-offset);
	}
	.end {
		display: grid;
		justify-items: end;
		gap: 0.25rem;
	}
	.amount {
		font-weight: 600;
		font-variant-numeric: tabular-nums;
	}
	.struck {
		color: var(--ui-muted);
		text-decoration: line-through;
	}
</style>
