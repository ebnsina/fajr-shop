<script lang="ts">
	import { highlightIcons as icons } from './highlight-icons.js';
	import type { components } from '#lib/api.js';

	// The shop's promises, as the owner wrote them in store settings.
	let { items }: { items: components['schemas']['Highlight'][] } = $props();
</script>

<div class="site-container wrap">
	<ul class="highlights">
		{#each items as h (h.title)}
			{@const Icon = icons[h.icon]}
			<li>
				<span>
					<strong>{h.title}</strong>
					{#if h.text}<span class="text">{h.text}</span>{/if}
				</span>
				<span class="icon"><Icon size={22} strokeWidth={1.75} /></span>
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
		gap: 1rem;
		margin: 0;
		padding: 0;
		list-style: none;
	}
	li {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.875rem;
		padding: 1rem 1.25rem;
		border-radius: calc(var(--ui-radius) * 1.5);
		background: var(--ui-surface);
		box-shadow: var(--ui-shadow-xs);
	}
	.icon {
		display: grid;
		flex: none;
		place-items: center;
		inline-size: 2.75rem;
		block-size: 2.75rem;
		border-radius: var(--ui-radius);
		background: var(--ui-accent);
		color: var(--ui-on-accent);
	}
	@media (width < 64rem) {
		.highlights {
			grid-template-columns: repeat(2, minmax(0, 1fr));
			gap: 0.75rem;
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
