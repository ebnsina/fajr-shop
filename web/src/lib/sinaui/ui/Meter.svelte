<script lang="ts" module>
	/**
	 * How good a value is, by HTML <meter>'s rule: the region holding `optimum` is good, the one next to
	 * it so-so, the far one bad. Without low/high every value is good.
	 */
	export function tone(
		value: number,
		min: number,
		max: number,
		low = min,
		high = max,
		optimum = (min + max) / 2
	) {
		const region = (v: number) => (v < low ? 0 : v > high ? 2 : 1);
		const distance = Math.abs(region(value) - region(optimum));
		return (['good', 'fair', 'poor'] as const)[distance];
	}
</script>

<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import RollingNumber from './RollingNumber.svelte';

	interface Props extends HTMLAttributes<HTMLDivElement> {
		label: string;
		value: number;
		min?: number;
		max?: number;
		/** Below this is the low range. */
		low?: number;
		/** Above this is the high range. */
		high?: number;
		/** The best value: its range shows in the accent, the one beside it in amber, the far one in red. */
		optimum?: number;
		/** Show the formatted value beside the label. */
		showValue?: boolean;
		/** Formats the value for display and for screen readers. Defaults to a percentage of the range. */
		format?: (value: number, min: number, max: number) => string;
		/** What makes up the value (storage by type): drawn as parts of one bar, with a legend. */
		segments?: { label: string; value: number }[];
		/** Formats each part's amount in the legend. */
		formatSegment?: (value: number) => string;
		locale?: string;
	}

	const uid = $props.id();
	let {
		label,
		value,
		min = 0,
		max = 100,
		low,
		high,
		optimum,
		showValue = true,
		format,
		segments,
		formatSegment = (v) => new Intl.NumberFormat(locale).format(v),
		locale = 'en',
		class: className,
		...rest
	}: Props = $props();

	const ratio = $derived(Math.min(Math.max((value - min) / (max - min), 0), 1));
	const text = $derived(
		format
			? format(value, min, max)
			: new Intl.NumberFormat(locale, { style: 'percent' }).format(ratio)
	);
	const level = $derived(tone(value, min, max, low, high, optimum));
	// Each part starts where the one before ended; all in fractions of the whole range.
	const parts = $derived.by(() => {
		let start = 0;
		return (segments ?? []).map((s, i) => {
			const size = Math.max(0, s.value) / (max - min);
			const part = {
				...s,
				i,
				start: Math.min(start, 1),
				size: Math.min(size, 1 - Math.min(start, 1))
			};
			start += size;
			return part;
		});
	});
</script>

<div class={['meter', level, className]} {...rest}>
	<div class="head">
		<span id="{uid}-label">{label}</span>
		{#if showValue}<span class="value" aria-hidden="true"><RollingNumber value={text} /></span>{/if}
	</div>
	<div
		class="track"
		role="meter"
		aria-labelledby="{uid}-label"
		aria-valuemin={min}
		aria-valuemax={max}
		aria-valuenow={value}
		aria-valuetext={text}
	>
		{#if segments?.length}
			{#each parts as p (p.label)}
				<div class="fill part" style:--i={p.i} style:--start={p.start} style:--size={p.size}></div>
			{/each}
		{:else}
			<div class="fill" style:transform="scaleX({ratio})"></div>
		{/if}
	</div>
	{#if segments?.length}
		<ul class="legend">
			{#each parts as p (p.label)}
				<li style:--i={p.i}>
					<span class="dot" aria-hidden="true"></span>
					<span class="name">{p.label}</span>
					<span class="amount"><RollingNumber value={formatSegment(p.value)} /></span>
				</li>
			{/each}
		</ul>
	{/if}
</div>

<style>
	.meter {
		--tone: var(--ui-accent);
		/* Fills its column, so its length never follows the label's. */
		inline-size: 100%;
		display: grid;
		gap: 0.375rem;
		font: 0.875rem/1.4 var(--ui-font);
		color: var(--ui-fg);
	}
	.fair {
		--tone: var(--ui-warning);
	}
	.poor {
		--tone: var(--ui-danger);
	}
	.head {
		display: flex;
		justify-content: space-between;
		gap: 1rem;
	}
	.value {
		color: var(--ui-muted);
		font-variant-numeric: tabular-nums;
		transition: color var(--ui-dur) ease;
	}
	/* Out of the good range, the number takes the color too, not just the bar. */
	:is(.fair, .poor) .value {
		color: var(--tone);
	}
	.track {
		position: relative;
		block-size: 0.5rem;
		overflow: hidden;
		border-radius: 999px;
		background: var(--ui-hover);
	}
	/* scaleX, not width: it fills on the compositor, grows in from empty the first time and settles
	   on a soft spring when the value changes. */
	.fill {
		block-size: 100%;
		border-radius: inherit;
		background: var(--tone);
		transform-origin: left;
		transition:
			transform var(--ui-dur-spring) var(--ui-ease-spring),
			background-color var(--ui-dur) ease;
	}
	/* Parts: full-width layers moved to their start and scaled to their size. Each is a step lighter,
	   so they read as one family; a thin surface-colored edge keeps neighbors apart. */
	.part {
		position: absolute;
		inset: 0;
		border-radius: 0;
		background: color-mix(in srgb, var(--tone) calc(100% - var(--i) * 28%), var(--ui-hover));
		box-shadow: inset -2px 0 0 var(--ui-surface);
		transition-delay: calc(var(--i) * 60ms);
	}
	.legend {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem 1.25rem;
		margin: 0.25rem 0 0;
		padding: 0;
		list-style: none;
	}
	.legend li {
		display: grid;
		grid-template-columns: auto auto;
		align-items: center;
		column-gap: 0.375rem;
	}
	.dot {
		inline-size: 0.5rem;
		block-size: 0.5rem;
		border-radius: 2px;
		background: color-mix(in srgb, var(--tone) calc(100% - var(--i) * 28%), var(--ui-hover));
	}
	.name {
		color: var(--ui-muted);
	}
	.amount {
		grid-column: 2;
		font-weight: 600;
		font-variant-numeric: tabular-nums;
	}
	.track:dir(rtl) .fill {
		transform-origin: right;
	}
	.part {
		transform: translateX(calc(var(--start) * 100%)) scaleX(var(--size));
	}
	/* In right-to-left the parts run from the right edge. */
	.track:dir(rtl) .part {
		transform: translateX(calc(var(--start) * -100%)) scaleX(var(--size));
	}
	/* Last, so it wins over the rules above: everything grows in from empty the first time. */
	@starting-style {
		.fill {
			transform: scaleX(0);
		}
		.part {
			transform: translateX(calc(var(--start) * 100%)) scaleX(0);
		}
		.track:dir(rtl) .part {
			transform: translateX(calc(var(--start) * -100%)) scaleX(0);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.fill {
			transition: background-color var(--ui-dur) ease;
		}
	}
	@media (forced-colors: active) {
		.fill {
			forced-color-adjust: none;
			background: Highlight;
		}
	}
</style>
