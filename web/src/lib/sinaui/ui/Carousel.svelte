<script lang="ts" generics="T">
	import { reduced } from './motion';
	import type { Snippet } from 'svelte';
	import {
		ArrowLeft01Icon,
		ArrowRight01Icon,
		PauseIcon,
		PlayIcon
	} from '@hugeicons/core-free-icons';
	import Icon from './Icon.svelte';
	import { glide } from './glide';

	interface Props {
		/** Names the carousel ("Treasures of the House of Wisdom"). */
		label: string;
		slides: T[];
		slide: Snippet<[T, number]>;
		/** Slides in view at once. */
		perView?: number;
		/** ms between slides when playing on its own; off by default. */
		autoplay?: number;
		class?: string;
	}

	let { label, slides, slide, perView = 1, autoplay, class: className }: Props = $props();

	const id = $props.id();
	let track: HTMLDivElement;
	let dots = $state<HTMLDivElement>();
	let marker = $state<HTMLSpanElement>();
	let current = $state(0);
	// svelte-ignore state_referenced_locally
	let playing = $state(!!autoplay);
	let hovered = $state(false);
	let focused = $state(false);
	let hidden = $state(false);

	const last = $derived(Math.max(0, slides.length - perView));

	/** Scrolls the slide into place; scrollIntoView handles right-to-left for us. */
	function go(i: number) {
		const to = Math.max(0, Math.min(last, i));
		track.children[to]?.scrollIntoView({
			behavior: reduced() ? 'instant' : 'smooth',
			block: 'nearest',
			inline: 'start'
		});
	}

	// The slide in view is whichever is most visible; scrolling, swiping and buttons all land here.
	$effect(() => {
		// eslint-disable-next-line svelte/prefer-svelte-reactivity -- observer bookkeeping; `current` is the reactive result
		const visible = new Set<number>();
		const seen = new IntersectionObserver(
			(entries) => {
				for (const e of entries) {
					const i = [...track.children].indexOf(e.target);
					if (e.isIntersecting && e.intersectionRatio >= 0.6) visible.add(i);
					else visible.delete(i);
				}
				// With several in view, the current one is the first of them.
				if (visible.size) current = Math.min(last, ...visible);
			},
			{ root: track, threshold: [0.6] }
		);
		for (const el of track.children) seen.observe(el);
		return () => seen.disconnect();
	});

	// The marker glides to the current indicator.
	$effect(() => {
		void current;
		if (dots && marker) glide(marker, dots.children[current + 1] as HTMLElement, true, 250);
	});

	// Playing on its own pauses while hovered, focused or in a hidden tab (WCAG 2.2.2).
	$effect(() => {
		if (!autoplay || !playing || hovered || focused || hidden) return;
		const t = setInterval(() => go(current >= last ? 0 : current + 1), autoplay);
		return () => clearInterval(t);
	});
</script>

<svelte:document onvisibilitychange={() => (hidden = document.hidden)} />

<section
	class={['carousel', className]}
	aria-roledescription="carousel"
	aria-label={label}
	style:--per-view={perView}
	onpointerenter={() => (hovered = true)}
	onpointerleave={() => (hovered = false)}
	onfocusin={() => (focused = true)}
	onfocusout={(e) => (focused = e.currentTarget.contains(e.relatedTarget as Node | null))}
>
	<!-- Native scrolling with snap: swipes, trackpads and arrow keys all work, with momentum. -->
	<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
	<div
		bind:this={track}
		class="track"
		tabindex="0"
		id="{id}-track"
		aria-label="{label}, slides"
		role="region"
	>
		{#each slides as item, i (i)}
			<div
				class="slide"
				role="group"
				aria-roledescription="slide"
				aria-label="{i + 1} of {slides.length}"
				inert={i < current || i >= current + perView}
			>
				{@render slide(item, i)}
			</div>
		{/each}
	</div>

	<div class="controls">
		{#if autoplay}
			<button
				type="button"
				class="control"
				aria-label={playing ? 'Pause slides' : 'Play slides'}
				onclick={() => (playing = !playing)}
			>
				<Icon icon={playing ? PauseIcon : PlayIcon} size={16} />
			</button>
		{/if}
		<!-- One marker glides between the indicators. -->
		<div bind:this={dots} class="dots">
			<span class="marker" aria-hidden="true" bind:this={marker}></span>
			{#each Array.from({ length: last + 1 }, (_, i) => i) as i (i)}
				<button
					type="button"
					class="dot"
					aria-label="Go to slide {i + 1}"
					aria-current={i === current ? 'true' : undefined}
					onclick={() => go(i)}
				></button>
			{/each}
		</div>
		<span class="count" aria-hidden="true">{current + 1} / {last + 1}</span>
		<!-- Scrolling doesn't change the slides' content, so the change is said here (not while playing). -->
		<span class="sr-only" aria-live={playing && autoplay ? 'off' : 'polite'}>
			Slide {current + 1} of {last + 1}
		</span>
		<button
			type="button"
			class="control"
			aria-label="Previous slide"
			aria-controls="{id}-track"
			aria-disabled={current === 0 || undefined}
			onclick={() => go(current - 1)}
		>
			<Icon icon={ArrowLeft01Icon} size={16} class="flip" />
		</button>
		<button
			type="button"
			class="control"
			aria-label="Next slide"
			aria-controls="{id}-track"
			aria-disabled={current >= last || undefined}
			onclick={() => go(current + 1)}
		>
			<Icon icon={ArrowRight01Icon} size={16} class="flip" />
		</button>
	</div>
</section>

<style>
	.carousel {
		display: grid;
		gap: 0.75rem;
		min-inline-size: 0;
		grid-template-columns: minmax(0, 1fr);
		color: var(--ui-fg);
		font: 0.875rem/1.4 var(--ui-font);
	}
	.track {
		--gap: 0.75rem;
		display: flex;
		gap: var(--gap);
		overflow-x: auto;
		overscroll-behavior-inline: contain;
		scroll-snap-type: x mandatory;
		scrollbar-width: none;
		border-radius: calc(var(--ui-radius) * 1.5);
	}
	.track::-webkit-scrollbar {
		display: none;
	}
	.track:focus-visible {
		outline: var(--ui-ring-width) solid var(--ui-ring);
		outline-offset: var(--ui-ring-offset);
	}
	.slide {
		flex: 0 0 calc((100% - var(--gap) * (var(--per-view) - 1)) / var(--per-view));
		min-inline-size: 0;
		scroll-snap-align: start;
	}
	.controls {
		display: flex;
		align-items: center;
		gap: 0.375rem;
	}
	.dots {
		position: relative;
		display: flex;
		flex: 1;
		align-items: center;
		gap: 0.25rem;
	}
	.dot {
		inline-size: 1.25rem;
		block-size: 1.25rem;
		margin: 0;
		padding: 0;
		border: 0;
		border-radius: 50%;
		background: radial-gradient(circle, var(--ui-control-line) 3px, transparent 3.5px);
		cursor: pointer;
	}
	@media (pointer: coarse) {
		.dot {
			inline-size: 1.75rem;
			block-size: 1.75rem;
		}
	}
	.dot:focus-visible {
		outline: var(--ui-ring-width) solid var(--ui-ring);
		outline-offset: 0;
	}
	/* The current indicator: a filled dot that glides between positions (transform only). */
	.marker {
		position: absolute;
		top: 0;
		left: 0;
		transform-origin: 0 0;
		background: radial-gradient(circle, var(--ui-accent) 4px, transparent 4.5px);
		opacity: 0;
		pointer-events: none;
	}
	/* A 320px phone keeps the dots and buttons; the count repeats the dots and goes. */
	@media (max-width: 22rem) {
		.count {
			display: none;
		}
		.dots {
			gap: 0;
		}
	}
	.count {
		min-inline-size: 3.5rem;
		color: var(--ui-muted);
		font-variant-numeric: tabular-nums;
		text-align: end;
	}
	.control {
		display: grid;
		place-items: center;
		inline-size: 2.25rem;
		block-size: 2.25rem;
		margin: 0;
		padding: 0;
		border: 1px solid transparent;
		border-radius: 50%;
		background: var(--ui-subtle);
		color: var(--ui-fg);
		cursor: pointer;
		transition:
			background-color var(--ui-dur-press) ease,
			transform var(--ui-dur-press) var(--ui-ease-out),
			opacity var(--ui-dur) ease;
	}
	@media (pointer: coarse) {
		.control {
			inline-size: 2.75rem;
			block-size: 2.75rem;
		}
	}
	@media (hover: hover) and (pointer: fine) {
		.control:not([aria-disabled='true']):hover {
			background: var(--ui-hover);
		}
	}
	.control:active:not([aria-disabled='true']) {
		transform: scale(0.92);
	}
	.control[aria-disabled='true'] {
		opacity: 0.4;
		cursor: not-allowed;
	}
	.control:focus-visible {
		outline: var(--ui-ring-width) solid var(--ui-ring);
		outline-offset: var(--ui-ring-offset);
	}
	.controls :global(.flip:dir(rtl)) {
		transform: scaleX(-1);
	}
	.sr-only {
		position: absolute;
		inline-size: 1px;
		block-size: 1px;
		overflow: hidden;
		clip-path: inset(50%);
		white-space: nowrap;
	}
</style>
