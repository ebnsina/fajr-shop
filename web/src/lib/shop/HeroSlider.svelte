<script lang="ts">
	import { ArrowLeft01Icon, ArrowRight01Icon } from '@hugeicons/core-free-icons';
	import Icon from '#lib/sinaui/ui/Icon.svelte';
	import { onMount } from 'svelte';
	import type { components } from '#lib/api.js';
	import { slider as t } from '#lib/copy.js';
	import Banner from './Banner.svelte';

	// Big banner slides with the controls on the picture. The track is a scroll-snap strip, so
	// swiping on a phone is the browser's own; buttons and dots just scroll it.
	let { slides, label }: { slides: components['schemas']['Banner'][]; label: string } = $props();

	let track = $state<HTMLElement>();
	let current = $state(0);
	let paused = $state(false);

	const go = (i: number) => {
		if (!track) return;
		const n = (i + slides.length) % slides.length;
		track.scrollTo({ left: n * track.clientWidth, behavior: 'smooth' });
	};

	onMount(() => {
		if (!track || slides.length < 2) return;
		const el = track;
		const onScroll = () => (current = Math.round(el.scrollLeft / el.clientWidth));
		el.addEventListener('scroll', onScroll, { passive: true });
		// No autoplay for people who asked for less motion; otherwise every 6 s while in view.
		const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
		const timer = still
			? undefined
			: setInterval(() => {
					if (!paused && !document.hidden) go(current + 1);
				}, 6000);
		return () => {
			el.removeEventListener('scroll', onScroll);
			clearInterval(timer);
		};
	});
</script>

<section
	class="slider"
	aria-roledescription="carousel"
	aria-label={label}
	onpointerenter={() => (paused = true)}
	onpointerleave={() => (paused = false)}
	onfocusin={() => (paused = true)}
	onfocusout={() => (paused = false)}
>
	<div class="track" bind:this={track}>
		{#each slides as b, i (b.id)}
			<div
				class="slide"
				role="group"
				aria-roledescription="slide"
				aria-label={t.of(i + 1, slides.length)}
				inert={i !== current}
			>
				<Banner banner={b} eager={i === 0} />
			</div>
		{/each}
	</div>

	{#if slides.length > 1}
		<button
			type="button"
			class="arrow prev"
			aria-label={t.previous}
			onclick={() => go(current - 1)}
		>
			<Icon icon={ArrowLeft01Icon} size={22} />
		</button>
		<button type="button" class="arrow next" aria-label={t.next} onclick={() => go(current + 1)}>
			<Icon icon={ArrowRight01Icon} size={22} />
		</button>
		<div class="dots">
			{#each slides as b, i (b.id)}
				<button
					type="button"
					class={['dot', i === current && 'on']}
					aria-label={t.goTo(i + 1)}
					aria-current={i === current ? 'true' : undefined}
					onclick={() => go(i)}
				></button>
			{/each}
		</div>
	{/if}
</section>

<style>
	.slider {
		position: relative;
		overflow: hidden;
		border-radius: var(--ui-radius);
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
		aspect-ratio: 2 / 1;
		scroll-snap-align: start;
	}
	.slide :global(.banner) {
		border-radius: 0;
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
		background: color-mix(in srgb, var(--bg-surface) 85%, transparent);
		color: var(--text-primary);
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
	.slider:hover .arrow,
	.arrow:focus-visible {
		opacity: 1;
	}
	@media (hover: none) {
		.arrow {
			display: none; /* phones swipe */
		}
	}
	.dots {
		position: absolute;
		inset-block-end: 0.75rem;
		inset-inline: 0;
		display: flex;
		justify-content: center;
		gap: 0.375rem;
	}
	.dot {
		inline-size: 0.5rem;
		block-size: 0.5rem;
		padding: 0;
		border: 0;
		border-radius: 999px;
		background: color-mix(in srgb, var(--on-dark) 55%, transparent);
		box-shadow: 0 0 0 1px color-mix(in srgb, var(--text-primary) 8%, transparent);
		cursor: pointer;
		transition: inline-size var(--ui-dur) var(--ui-ease-out);
	}
	.dot.on {
		inline-size: 1.5rem;
		background: var(--on-dark);
	}
	.arrow:focus-visible,
	.dot:focus-visible {
		outline: var(--ui-ring-width) solid var(--on-dark);
		outline-offset: 2px;
	}
	@media (prefers-reduced-motion: reduce) {
		.track {
			scroll-behavior: auto;
		}
		.dot {
			transition: none;
		}
	}
</style>
