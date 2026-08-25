<script lang="ts">
	// Colour alone can't carry a rating, so the number goes in the label too.
	let { rating, size = 16 }: { rating: number; size?: number } = $props();
	const rounded = $derived(Math.round(rating * 2) / 2);
</script>

<span class="stars" style="--size: {size}px" role="img" aria-label="{rating} out of 5">
	{#each [1, 2, 3, 4, 5] as i (i)}
		<span class="star" class:full={rounded >= i} class:half={rounded === i - 0.5} aria-hidden="true">★</span>
	{/each}
</span>

<style>
	.stars {
		display: inline-flex;
		gap: 0.05em;
		font-size: var(--size);
		line-height: 1;
	}
	.star {
		color: var(--c-line);
	}
	.star.full {
		color: #e0a516;
	}
	/* A half star is the filled glyph clipped, so it needs no second icon. */
	.star.half {
		background: linear-gradient(90deg, #e0a516 50%, var(--c-line) 50%);
		-webkit-background-clip: text;
		background-clip: text;
		color: transparent;
	}
</style>
