<script lang="ts">
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import { onMount } from 'svelte';
	import type { components } from '#lib/api.js';
	import { shop as t, slider as s } from '#lib/copy.js';
	import ProductImage from './ProductImage.svelte';

	// A product's photos: thumbnails beside a large view that swipes on phones (scroll-snap) and
	// opens a larger copy on click.
	let { images, name }: { images: components['schemas']['Image'][]; name: string } = $props();

	let track = $state<HTMLElement>();
	let current = $state(0);
	const many = $derived(images.length > 1);

	const go = (i: number) => {
		if (!track) return;
		const n = (i + images.length) % images.length;
		track.scrollTo({ left: n * track.clientWidth, behavior: 'smooth' });
	};

	onMount(() => {
		if (!track) return;
		const el = track;
		const onScroll = () => (current = Math.round(el.scrollLeft / el.clientWidth));
		el.addEventListener('scroll', onScroll, { passive: true });
		return () => el.removeEventListener('scroll', onScroll);
	});
</script>

<div class={['gallery', many && 'many']}>
	{#if many}
		<div class="thumbs" role="group" aria-label={t.pictures}>
			{#each images as img, i (img.id)}
				<button
					type="button"
					class={['thumb', i === current && 'on']}
					aria-label={t.picture(i + 1, images.length)}
					aria-current={i === current ? 'true' : undefined}
					onclick={() => go(i)}
				>
					<ProductImage src={img.url} alt="" ratio="1" icon={16} />
				</button>
			{/each}
		</div>
	{/if}

	<div class="stage">
		<div class="track" bind:this={track}>
			{#if images.length}
				{#each images as img, i (img.id)}
					<div class="slide" inert={i !== current}>
						<ProductImage
							src={img.url}
							alt={many ? `${name}, ${t.picture(i + 1, images.length)}` : name}
							ratio="1"
							loading={i === 0 ? 'eager' : 'lazy'}
							zoom
						/>
					</div>
				{/each}
			{:else}
				<div class="slide"><ProductImage alt={name} ratio="1" /></div>
			{/if}
		</div>

		{#if many}
			<button
				type="button"
				class="arrow prev"
				aria-label={s.previous}
				onclick={() => go(current - 1)}
			>
				<ChevronLeft size={20} />
			</button>
			<button type="button" class="arrow next" aria-label={s.next} onclick={() => go(current + 1)}>
				<ChevronRight size={20} />
			</button>
			<span class="count" aria-hidden="true">{current + 1} / {images.length}</span>
		{/if}
	</div>
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
	.thumbs {
		display: grid;
		gap: 0.5rem;
	}
	/* The ring sits outside the picture, so it follows the picture's own corners exactly. */
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
	.stage {
		position: relative;
		overflow: hidden;
		border-radius: var(--ui-radius);
		background: var(--ui-surface);
	}
	.track {
		display: flex;
		overflow-x: auto;
		scroll-snap-type: x mandatory;
		scrollbar-width: none;
	}
	.track::-webkit-scrollbar {
		display: none;
	}
	.slide {
		flex: 0 0 100%;
		scroll-snap-align: start;
	}
	.arrow {
		position: absolute;
		inset-block-start: 50%;
		display: grid;
		place-items: center;
		inline-size: 2.5rem;
		block-size: 2.5rem;
		border: 0;
		border-radius: 50%;
		background: rgb(255 255 255 / 0.9);
		color: #0f172a;
		box-shadow: var(--ui-shadow-xs);
		cursor: pointer;
		opacity: 0;
		translate: 0 -50%;
		transition: opacity var(--ui-dur) var(--ui-ease-out);
	}
	.prev {
		inset-inline-start: 0.75rem;
	}
	.next {
		inset-inline-end: 0.75rem;
	}
	.stage:hover .arrow,
	.arrow:focus-visible {
		opacity: 1;
	}
	.count {
		position: absolute;
		inset-block-end: 0.75rem;
		inset-inline-end: 0.75rem;
		padding: 0.125rem 0.5rem;
		border-radius: 999px;
		background: rgb(15 23 42 / 0.65);
		color: #fff;
		font-size: 0.75rem;
		font-variant-numeric: tabular-nums;
	}
	.thumb:focus-visible {
		outline-color: var(--ui-ring);
	}
	.arrow:focus-visible {
		outline: var(--ui-ring-width) solid var(--ui-ring);
		outline-offset: var(--ui-ring-offset);
	}
	@media (hover: none) {
		.arrow {
			display: none;
		}
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
			padding: 4px; /* room for the ring inside the scroll area */
		}
	}
</style>
