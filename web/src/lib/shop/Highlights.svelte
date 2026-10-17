<script lang="ts">
	import Banknote from '@lucide/svelte/icons/banknote';
	import Gift from '@lucide/svelte/icons/gift';
	import Headset from '@lucide/svelte/icons/headset';
	import ShieldCheck from '@lucide/svelte/icons/shield-check';
	import Truck from '@lucide/svelte/icons/truck';
	import Undo2 from '@lucide/svelte/icons/undo-2';
	import type { components } from '#lib/api.js';

	// The shop's promises, as the owner wrote them in store settings.
	let { items }: { items: components['schemas']['Highlight'][] } = $props();
	const icons = {
		truck: Truck,
		cash: Banknote,
		return: Undo2,
		shield: ShieldCheck,
		phone: Headset,
		gift: Gift
	};
</script>

<div class="site-container wrap">
	<ul class="highlights">
		{#each items as h (h.title)}
			{@const Icon = icons[h.icon]}
			<li>
				<span class="icon"><Icon size={24} strokeWidth={1.75} /></span>
				<span>
					<strong>{h.title}</strong>
					{#if h.text}<span class="text">{h.text}</span>{/if}
				</span>
			</li>
		{/each}
	</ul>
</div>

<style>
	.wrap {
		margin-block-start: 1.5rem;
	}
	.highlights {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: 1px;
		margin: 0;
		padding: 0;
		overflow: hidden;
		border-radius: var(--ui-radius);
		background: var(--ui-line);
		list-style: none;
	}
	li {
		display: flex;
		align-items: center;
		gap: 0.875rem;
		padding: 1rem 1.25rem;
		background: var(--ui-surface);
	}
	.icon {
		display: grid;
		flex: none;
		place-items: center;
		inline-size: 2.75rem;
		block-size: 2.75rem;
		border-radius: 50%;
		background: color-mix(in srgb, var(--ui-accent) 12%, transparent);
		color: var(--ui-accent);
	}
	@media (width < 64rem) {
		.highlights {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}
	@media (width < 32rem) {
		.highlights {
			grid-template-columns: minmax(0, 1fr);
		}
	}
	strong {
		display: block;
		font-size: 0.875rem;
	}
	.text {
		display: block;
		color: var(--ui-muted);
		font-size: 0.8125rem;
	}
</style>
