<script lang="ts">
	import { cubicInOut } from 'svelte/easing';
	import { prefersReducedMotion } from 'svelte/motion';
	import { fly } from 'svelte/transition';
	import ToastItem from './ToastItem.svelte';
	import { toasts } from './toast.svelte';

	let { label = 'Notifications' }: { label?: string } = $props();

	const VISIBLE = 3; // how many cards show; older ones wait hidden behind
	const PEEK = 14; // px each card behind peeks out above the one in front
	const SHRINK = 0.05; // each card behind is 5% smaller
	const GAP = 12; // px between cards when fanned out

	let hovered = $state(false);
	let focused = $state(false);
	let hidden = $state(false);
	let heights = $state<Record<number, number>>({});

	// Hover or focus fans the stack out; the same moments pause every countdown (WCAG 2.2.1).
	const expanded = $derived(hovered || focused);
	const paused = $derived(expanded || hidden);

	// Depth 0 is the newest, in front.
	const newestFirst = $derived([...toasts].reverse());
	const shown = $derived(newestFirst.slice(0, VISIBLE));
	const front = $derived(shown[0] ? (heights[shown[0].id] ?? 0) : 0);
	// Fanned out, each card sits above the ones newer than it.
	const offsets = $derived(
		shown.reduce<number[]>(
			(acc, t, i) => [...acc, i === 0 ? 0 : acc[i - 1] + (heights[shown[i - 1].id] ?? 0) + GAP],
			[]
		)
	);
	const stackHeight = $derived(
		!shown.length
			? 0
			: expanded
				? offsets[shown.length - 1] + (heights[shown[shown.length - 1].id] ?? 0)
				: front + PEEK * (shown.length - 1)
	);
	const still = $derived(prefersReducedMotion.current);

	let section: HTMLElement;
	// Where focus was before it entered the toasts, to give it back (F6, or the last toast closing).
	let before: HTMLElement | null = null;
	const giveBack = () => {
		(before?.isConnected ? before : document.body).focus();
		before = null;
	};

	// F6 jumps to the newest toast and back, like moving between landmarks (React Aria's useLandmark).
	function onkeydown(e: KeyboardEvent) {
		if (e.key !== 'F6' || !toasts.length) return;
		e.preventDefault();
		if (section.contains(document.activeElement)) giveBack();
		else section.querySelector<HTMLElement>('li:last-child .close')?.focus();
	}
</script>

<svelte:document onvisibilitychange={() => (hidden = document.hidden)} />
<svelte:window {onkeydown} />

<!-- Always in the page, so screen readers already know the live region when a toast arrives. -->
<section
	bind:this={section}
	class="toaster"
	aria-label={label}
	onpointerenter={() => (hovered = true)}
	onpointerleave={() => (hovered = false)}
	onfocusin={(e) => {
		focused = true;
		const from = e.relatedTarget as HTMLElement | null;
		if (from && !section.contains(from)) before = from;
	}}
	onfocusout={(e) => (focused = e.currentTarget.contains(e.relatedTarget as Node | null))}
>
	<!-- The list's own box covers the gaps between fanned-out cards, so moving between them stays "hovering". -->
	<ol
		aria-live="polite"
		aria-relevant="additions text"
		class:still
		style:block-size="{stackHeight}px"
	>
		{#each toasts as t, i (t.id)}
			{@const depth = toasts.length - 1 - i}
			<li
				style:--y="{expanded ? -(offsets[depth] ?? 0) : -PEEK * depth}px"
				style:--s={expanded ? 1 : 1 - SHRINK * depth}
				style:z-index={VISIBLE + 1 - depth}
				data-hidden={depth >= VISIBLE || undefined}
				inert={depth >= VISIBLE}
				out:fly={{ y: still ? 0 : 16, duration: 200, easing: cubicInOut }}
				onoutrostart={(e) => {
					// A toast on its way out can't catch a click meant for the one arriving in its place.
					e.currentTarget.style.pointerEvents = 'none';
				}}
			>
				<ToastItem
					toast={t}
					{paused}
					height={!expanded && depth > 0 && front ? front : undefined}
					muted={!expanded && depth > 0}
					onmeasure={(h) => (heights[t.id] = h)}
					onfocuslost={giveBack}
				/>
			</li>
		{/each}
	</ol>
</section>

<style>
	.toaster {
		position: fixed;
		inset-block-end: max(1rem, env(safe-area-inset-bottom));
		inset-inline-end: 1rem;
		z-index: 50;
	}
	ol {
		position: relative;
		inline-size: min(24rem, 100vw - 2rem);
		margin: 0;
		padding: 0;
		list-style: none;
	}
	li {
		--enter: 0%;
		position: absolute;
		inset-block-end: 0;
		inset-inline-end: 0;
		transform-origin: bottom center;
		transform: translateY(calc(var(--y) + var(--enter))) scale(var(--s));
		/* Transitions, not keyframes: a toast arriving mid-move retargets smoothly (Emil: toasts). */
		transition:
			transform 400ms var(--ui-ease-out),
			opacity 400ms var(--ui-ease-out);
	}
	/* The newest slides up from below its own height. */
	@starting-style {
		li {
			--enter: 100%;
			opacity: 0;
		}
	}
	li[data-hidden] {
		opacity: 0;
		pointer-events: none;
	}
	.still li {
		transition: opacity 150ms ease;
	}
	@starting-style {
		.still li {
			--enter: 0%;
		}
	}
	@media (max-width: 30rem) {
		.toaster {
			inset-inline: 1rem;
		}
		ol {
			inline-size: 100%;
		}
	}
</style>
