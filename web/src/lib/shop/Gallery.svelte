<script lang="ts">
	import type { components } from '#lib/api.js';
	import { shop as t } from '#lib/copy.js';
	import Carousel from '#lib/sinaui/ui/Carousel.svelte';
	import { scrollEdges } from '#lib/sinaui/ui/scroll-edges.js';
	import ProductImage from './ProductImage.svelte';

	// A product's photos: sinaui's carousel (swipe, arrows, dots) with thumbnails that pick a slide.
	let { images, name }: { images: components['schemas']['Image'][]; name: string } = $props();

	let carousel = $state<Carousel<components['schemas']['Image']>>();
	let current = $state(0);
	const many = $derived(images.length > 1);
</script>

<div class={['gallery', many && 'many']}>
	{#if many}
		<div class="thumbs" role="group" aria-label={t.pictures} {@attach scrollEdges} data-fade="x">
			{#each images as img, i (img.id)}
				<button
					type="button"
					class={['thumb', i === current && 'on']}
					aria-label={t.picture(i + 1, images.length)}
					aria-current={i === current ? 'true' : undefined}
					onclick={() => carousel?.go(i)}
				>
					<ProductImage src={img.url} alt="" ratio="1" icon={16} />
				</button>
			{/each}
		</div>
		<Carousel bind:this={carousel} bind:current label={t.pictures} slides={images}>
			{#snippet slide(img, i)}
				<ProductImage
					src={img.url}
					alt="{name}, {t.picture(i + 1, images.length)}"
					ratio="1"
					loading={i === 0 ? 'eager' : 'lazy'}
					zoom
				/>
			{/snippet}
		</Carousel>
	{:else}
		<ProductImage src={images[0]?.url} alt={name} ratio="1" loading="eager" zoom />
	{/if}
</div>

<style>
	.gallery {
		display: grid;
		gap: 0.75rem;
	}
	.many {
		grid-template-columns: 4.5rem minmax(0, 1fr);
		align-items: start;
	}
	/* Padding inside: the edge fade masks to this box, and the ring sits just outside each picture. */
	.thumbs {
		display: grid;
		gap: 0.5rem;
		padding: 4px;
	}
	.thumb {
		padding: 0;
		border: 0;
		border-radius: var(--ui-radius);
		background: none;
		cursor: pointer;
		opacity: 0.65;
		outline: 2px solid transparent;
		outline-offset: 2px;
		transition:
			opacity var(--ui-dur-press) ease,
			outline-color var(--ui-dur-press) ease;
	}
	.thumb:hover,
	.thumb.on {
		opacity: 1;
	}
	.thumb.on {
		outline-color: var(--ui-accent);
	}
	.thumb:focus-visible {
		outline-color: var(--ui-ring);
	}
	@media (width < 56rem) {
		/* Phones: the large view first, thumbnails in a row under it. */
		.many {
			grid-template-columns: minmax(0, 1fr);
		}
		.thumbs {
			order: 1;
			grid-auto-flow: column;
			grid-auto-columns: 4rem;
			overflow-x: auto;
			scrollbar-width: none;
		}
	}
</style>
