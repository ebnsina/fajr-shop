<script lang="ts">
	import type { components } from '#lib/api.js';

	// A banner picture, a link when it leads somewhere.
	let { banner: b, eager = false }: { banner: components['schemas']['Banner']; eager?: boolean } =
		$props();
</script>

{#snippet picture()}
	<img
		src={b.image.url}
		alt={b.alt}
		width={b.image.width}
		height={b.image.height}
		loading={eager ? 'eager' : 'lazy'}
		fetchpriority={eager ? 'high' : undefined}
	/>
{/snippet}

{#if b.link}<a class="banner" href={b.link}>{@render picture()}</a>
{:else}<div class="banner">{@render picture()}</div>{/if}

<style>
	.banner {
		display: block;
		block-size: 100%;
		overflow: hidden;
		border-radius: var(--ui-radius);
		background: var(--ui-subtle);
	}
	img {
		display: block;
		inline-size: 100%;
		block-size: 100%;
		object-fit: cover;
	}
	a:focus-visible {
		outline: var(--ui-ring-width) solid var(--ui-ring);
		outline-offset: var(--ui-ring-offset);
	}
</style>
