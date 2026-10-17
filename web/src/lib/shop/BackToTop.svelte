<script lang="ts">
	import ArrowUp from '@lucide/svelte/icons/arrow-up';
	import { onMount } from 'svelte';
	import { storefront as t } from '#lib/copy.js';

	// Appears once the shopper is well down a long page; takes them back to the top.
	let shown = $state(false);
	onMount(() => {
		const onScroll = () => (shown = scrollY > 600);
		onScroll();
		addEventListener('scroll', onScroll, { passive: true });
		return () => removeEventListener('scroll', onScroll);
	});
	function top() {
		const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
		scrollTo({ top: 0, behavior: still ? 'auto' : 'smooth' });
	}
</script>

<button
	type="button"
	class={['top', shown && 'shown']}
	aria-label={t.backToTop}
	inert={!shown}
	onclick={top}
>
	<ArrowUp size={20} />
</button>

<style>
	.top {
		position: fixed;
		inset-inline-end: 1.25rem;
		inset-block-end: 1.25rem;
		z-index: 19;
		display: grid;
		place-items: center;
		inline-size: 2.75rem;
		block-size: 2.75rem;
		border: 0;
		border-radius: 50%;
		background: var(--ui-accent);
		color: var(--ui-on-accent);
		box-shadow: var(--ui-shadow-card);
		cursor: pointer;
		opacity: 0;
		translate: 0 0.75rem;
		transition:
			opacity var(--ui-dur) var(--ui-ease-out),
			translate var(--ui-dur) var(--ui-ease-out);
	}
	.shown {
		opacity: 1;
		translate: 0 0;
	}
	.top:focus-visible {
		outline: var(--ui-ring-width) solid var(--ui-ring);
		outline-offset: var(--ui-ring-offset);
	}
	@media (width < 48rem) {
		.top {
			inset-block-end: 5rem; /* above the bottom bar */
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.top {
			transition: none;
		}
	}
</style>
