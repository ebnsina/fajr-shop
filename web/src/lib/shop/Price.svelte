<script lang="ts">
	import { shop as t } from '#lib/copy.js';
	import { formatMoney } from '#lib/money.js';

	// A price in poisha; on sale, the old price struck through beside it.
	let {
		amount,
		was,
		from = false,
		size = 'md'
	}: { amount: number; was?: number | null; from?: boolean; size?: 'md' | 'lg' } = $props();
</script>

<span class={['price', size]}>
	{#if from}<span class="from">{t.from}</span>{/if}
	<span class={['now', was && 'sale']}>{formatMoney(amount)}</span>
	{#if was}<s><span class="sr">{t.was} </span>{formatMoney(was)}</s>{/if}
</span>

<style>
	.price {
		display: inline-flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 0.25rem 0.5rem;
		font-variant-numeric: tabular-nums;
	}
	.from {
		color: var(--ui-muted);
		font-size: 0.875em;
	}
	.now {
		font-weight: 600;
	}
	.sale {
		color: color-mix(in srgb, var(--ui-danger) 85%, var(--ui-fg));
	}
	s {
		color: var(--ui-muted);
		font-size: 0.875em;
	}
	.lg .now {
		font-size: 1.5rem;
	}
	.sr {
		position: absolute;
		inline-size: 1px;
		block-size: 1px;
		overflow: hidden;
		clip-path: inset(50%);
	}
</style>
