<script lang="ts">
	import { onMount, untrack, type Snippet } from 'svelte';
	import type {
		ChartTooltipBodyContext,
		ChartTooltipBodyTarget,
		DomChartDefinition
	} from '@tanstack/charts';
	import { createChartRendererAdapter } from '@tanstack/charts/adapter/renderer';
	import { motion } from '@tanstack/charts/motion';
	import { inView } from './in-view';

	/* eslint-disable @typescript-eslint/no-explicit-any */
	interface Props {
		/** Shown above the chart and read as its name. */
		title: string;
		/** One sentence on what it shows or the takeaway; shown and read with it. */
		description?: string;
		definition: DomChartDefinition<any, any, any>;
		/** Width ÷ height; the space is reserved before the chart draws, so nothing shifts. */
		aspectRatio?: number;
		height?: number;
		/** Drawn in the middle of the plot: a donut's total, a gauge's reading. */
		center?: Snippet;
		/** Your own tooltip content, in place of the standard one. */
		tooltipBody?: Snippet<[ChartTooltipBodyContext<any, any, any>]>;
		class?: string;
	}
	/* eslint-enable @typescript-eslint/no-explicit-any */

	let {
		title,
		description,
		definition,
		aspectRatio = 16 / 9,
		height,
		center,
		tooltipBody,
		class: className
	}: Props = $props();
	const id = $props.id();

	// Marks draw themselves in (bars grow, lines draw, slices sweep) on a spring, the first time the
	// chart is on screen; later data changes animate the same way. Reduced motion snaps.
	const renderer = motion({
		initial: 'always',
		transition: { type: 'spring', stiffness: 170, damping: 24, mass: 1 }
	});
	let tooltip = $state.raw<ChartTooltipBodyTarget | null>(null);
	const options = $derived({
		definition,
		ariaLabel: title,
		ariaDescription: description,
		aspectRatio,
		height,
		idPrefix: `ts-chart-${id.replaceAll(/[^a-zA-Z0-9_-]/g, '')}`,
		renderer,
		onTooltipBodyChange: tooltipBody
			? (t: ChartTooltipBodyTarget | null) => (tooltip = t)
			: undefined
	});
	const adapter = untrack(() => createChartRendererAdapter(options));
	// The server draws the finished chart (kept for no-JavaScript readers, hidden until it animates).
	const initialMarkup = adapter.prerender();

	let surface: HTMLDivElement;
	let live = $state(false);
	$effect(() => {
		if (live) adapter.update(options);
	});
	onMount(() => () => adapter.destroy());
	// Charts further down the page wait until they're scrolled to, so their entrance is seen.
	const enter = inView(
		() => {
			adapter.mount(surface);
			live = true;
		},
		{ threshold: 0.3 }
	);
</script>

<figure class={['chart', className]} aria-labelledby="{id}-title">
	<figcaption>
		<span id="{id}-title" class="title">{title}</span>
		{#if description}<span class="description">{description}</span>{/if}
	</figcaption>
	<div
		class={['plot', live && 'live']}
		style:aspect-ratio={height ? undefined : aspectRatio}
		style:block-size={height ? `${height}px` : undefined}
	>
		<div bind:this={surface} class="ts-chart-surface surface" {@attach enter}>
			<!-- eslint-disable-next-line svelte/no-at-html-tags -- the chart library's own SVG. -->
			{@html initialMarkup}
		</div>
		{#if center}<div class="center">{@render center()}</div>{/if}
	</div>
</figure>

{#if tooltipBody && tooltip}
	{@const t = tooltip}
	<div {@attach (node) => void t.element.append(node)}>{@render tooltipBody(t)}</div>
{/if}

<style>
	/* TanStack Charts reads its colors from these variables and currentColor: the chart follows
	   Sina UI's tokens in light and dark with no per-chart theme. */
	.chart {
		--ts-chart-1: var(--ui-accent);
		--ts-chart-2: var(--ui-warning);
		--ts-chart-3: light-dark(#0369a1, #38bdf8);
		--ts-chart-4: light-dark(#be123c, #fb7185);
		--ts-chart-5: light-dark(#6d28d9, #a78bfa);
		--ts-chart-6: var(--ui-muted);
		--ts-chart-focus-fill: var(--ui-surface);
		--ts-chart-tooltip-background: var(--ui-surface);
		--ts-chart-tooltip-color: var(--ui-fg);
		--ts-chart-tooltip-border: 1px solid transparent;
		--ts-chart-tooltip-border-radius: var(--ui-radius);
		--ts-chart-tooltip-shadow: var(--ui-shadow-overlay);
		--ts-chart-tooltip-font: 0.8125rem/1.4 var(--ui-font);
		--ts-chart-tooltip-active-row-background: var(--ui-subtle);
		display: grid;
		gap: 0.75rem;
		/* Fills its container, even a flex row that would shrink it to the chart's minimum. */
		box-sizing: border-box;
		inline-size: 100%;
		margin: 0;
		min-inline-size: 0;
		color: var(--ui-fg);
		font: 0.8125rem/1.4 var(--ui-font);
		font-variant-numeric: tabular-nums;
	}
	figcaption {
		display: grid;
		gap: 0.125rem;
	}
	.title {
		font-size: 0.9375rem;
		font-weight: 600;
	}
	.description {
		color: var(--ui-muted);
	}
	.plot {
		position: relative;
		min-inline-size: 0;
		color: var(--ui-muted);
	}
	.surface {
		inline-size: 100%;
		block-size: 100%;
	}
	/* With JavaScript, the static chart waits hidden in its reserved space until it animates in. */
	@media (scripting: enabled) {
		.plot:not(.live) .surface {
			visibility: hidden;
		}
	}
	.center {
		position: absolute;
		inset: 0;
		display: grid;
		place-content: center;
		color: var(--ui-fg);
		text-align: center;
		pointer-events: none;
	}
	/* The tooltip grows in out of a blur, glides from point to point while shown, and fades out.
	   It only glides while visible: from hidden it has no position to travel from. */
	.plot :global(.ts-chart-tooltip) {
		transform-origin: 50% 100%;
		transition:
			left 200ms var(--ui-ease-out),
			top 200ms var(--ui-ease-out),
			opacity 150ms ease,
			scale 150ms var(--ui-ease-out),
			filter 150ms ease,
			display 150ms allow-discrete;
	}
	.plot :global(.ts-chart-tooltip[hidden]) {
		opacity: 0;
		scale: 0.97;
	}
	@starting-style {
		.plot :global(.ts-chart-tooltip:not([hidden])) {
			opacity: 0;
			scale: 0.94;
			filter: blur(4px);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.plot :global(.ts-chart-tooltip) {
			transition:
				opacity 150ms ease,
				display 150ms allow-discrete;
		}
		@starting-style {
			.plot :global(.ts-chart-tooltip:not([hidden])) {
				scale: 1;
				filter: none;
			}
		}
	}
	.plot :global(svg:focus-visible) {
		outline: var(--ui-ring-width) solid var(--ui-ring);
		outline-offset: var(--ui-ring-offset);
		border-radius: var(--ui-radius);
	}
</style>
