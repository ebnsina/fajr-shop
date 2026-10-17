<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';

	interface Props extends HTMLAttributes<HTMLSpanElement> {
		width?: string;
		height?: string;
		circle?: boolean;
		/** Several lines of text: each a little shorter, the last one clearly so, like a paragraph. */
		lines?: number;
		/** Each line's full height. Defaults to the surrounding text's, so lines match real text exactly. */
		lineHeight?: string;
	}

	let {
		width = '100%',
		height = '1rem',
		circle = false,
		lines,
		lineHeight = '1lh',
		class: className,
		...rest
	}: Props = $props();

	// Fixed, varied widths (not random) so the placeholder never changes between renders.
	const widths = ['100%', '94%', '97%', '88%', '92%'];
</script>

<!-- Decorative: mark the loading region itself with aria-busy="true" and a text status instead. -->
{#if lines}
	<span class={['lines', className]} style:inline-size={width} aria-hidden="true" {...rest}>
		{#each { length: lines }, i (i)}
			<span class="line" style:block-size={lineHeight}>
				<span
					class="skeleton"
					style:inline-size={i === lines - 1 && lines > 1 ? '60%' : widths[i % widths.length]}
					style:block-size={height}
				></span>
			</span>
		{/each}
	</span>
{:else}
	<span
		class={['skeleton', circle && 'circle', className]}
		style:inline-size={width}
		style:block-size={circle ? width : height}
		aria-hidden="true"
		{...rest}
	></span>
{/if}

<style>
	/* Each line sits in a slot one line of text tall, the bar centered in it, as text sits in its line. */
	.lines {
		display: grid;
	}
	.line {
		display: grid;
		align-items: center;
	}
	/* One calm sheen for the whole page: its gradient is laid out against the viewport, so every block
	   shows the same band at the same moment and it reads as one sweep across the group. */
	.skeleton {
		display: block;
		border-radius: calc(var(--ui-radius) * 0.75);
		background-color: var(--ui-hover);
		background-image: linear-gradient(
			100deg,
			transparent 40%,
			color-mix(in srgb, var(--ui-surface) 55%, transparent) 50%,
			transparent 60%
		);
		background-size: 200vw 100%;
		background-attachment: fixed;
		background-repeat: no-repeat;
		animation: sweep 2s var(--ui-ease-in-out) infinite;
	}
	.circle {
		border-radius: 50%;
	}
	@keyframes sweep {
		from {
			background-position: 100vw 0;
		}
		to {
			background-position: -200vw 0;
		}
	}
	/* Arrives softly, so a quick load doesn't flash gray. */
	@starting-style {
		.skeleton {
			opacity: 0;
		}
	}
	.skeleton {
		transition: opacity var(--ui-dur) var(--ui-ease-out) 120ms;
	}
	@media (prefers-reduced-motion: reduce) {
		.skeleton {
			animation: none;
			background-image: none;
		}
	}
	@media (forced-colors: active) {
		.skeleton {
			background: GrayText;
		}
	}
</style>
