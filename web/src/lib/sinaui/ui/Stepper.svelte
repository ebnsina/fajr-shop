<script lang="ts">
	import { AlertCircleIcon, Tick02Icon } from '@hugeicons/core-free-icons';
	import Icon from './Icon.svelte';

	interface Props {
		/** error: something to fix on that step, shown in place of its description. */
		steps: { label: string; description?: string; error?: string }[];
		/** Index of the step in progress; steps before it are done. */
		current?: number;
		/** Called when a finished step is chosen, to go back to it. Without it, steps can't be chosen. */
		onstep?: (index: number) => void;
		label?: string;
		/** vertical: markers down the side with names beside them, for sidebars and narrow columns. */
		orientation?: 'horizontal' | 'vertical';
	}

	let {
		steps,
		current = $bindable(0),
		onstep,
		label = 'Progress',
		orientation = 'horizontal'
	}: Props = $props();

	const last = $derived(steps.length - 1);
	// How far the track is filled: from the first marker to the current one.
	const fill = $derived(last > 0 ? Math.min(current, last) / last : 0);
</script>

<nav aria-label={label} class={['stepper', orientation]}>
	<!-- Narrow screens show only the current step's name; this says where it is in the list. -->
	<p class="count" aria-hidden="true">
		Step {Math.min(current, last) + 1} of {steps.length}: {steps[Math.min(current, last)]?.label}
	</p>
	<div class="rail" style:--n={steps.length}>
		<span class="track" aria-hidden="true"><span class="fill" style:--fill={fill}></span></span>
		<ol>
			{#each steps as step, i (i)}
				{@const state = i < current ? 'done' : i === current ? 'current' : 'next'}
				<li
					class={[state, step.error && 'error']}
					aria-current={state === 'current' ? 'step' : undefined}
				>
					<!-- Vertical: the line down to the next marker, filled once this step is done. -->
					{#if i < last}<span class="link" aria-hidden="true"></span>{/if}
					{#if state === 'done' && onstep}
						<button type="button" class="step" onclick={() => onstep(i)}>
							{@render inner(step, i, state)}
						</button>
					{:else}
						<span class="step">{@render inner(step, i, state)}</span>
					{/if}
				</li>
			{/each}
		</ol>
	</div>
</nav>

{#snippet inner(step: Props['steps'][number], i: number, state: string)}
	<span class="marker" aria-hidden="true">
		{#if step.error}
			<span class="tick"><Icon icon={AlertCircleIcon} size={16} strokeWidth={2} /></span>
		{:else if state === 'done'}
			<span class="tick"><Icon icon={Tick02Icon} size={14} strokeWidth={2.5} /></span>
		{:else}
			{i + 1}
		{/if}
	</span>
	<span class="text">
		<!-- One hidden phrase for screen readers (split across elements, its spaces get lost), and the
		     visible label hidden from them. -->
		<span class="sr-only"
			>Step {i + 1} of {steps.length}: {step.label}{state === 'done'
				? ', completed'
				: state === 'current'
					? ', current'
					: ''}{step.error ? `, needs attention: ${step.error}` : ''}</span
		>
		<span class="name" aria-hidden="true">{step.label}</span>
		{#if step.error}<span class="description problem" aria-hidden="true">{step.error}</span>
		{:else if step.description}<span class="description">{step.description}</span>{/if}
	</span>
{/snippet}

<style>
	.stepper {
		container-type: inline-size;
		color: var(--ui-fg);
		font: 0.875rem/1.4 var(--ui-font);
	}
	.count {
		display: none;
		margin: 0 0 0.5rem;
		color: var(--ui-muted);
		font-size: 0.8125rem;
	}
	/* Equal columns; each marker sits at its column's center, the track runs between the outer ones. */
	.rail {
		position: relative;
	}
	ol {
		position: relative;
		display: grid;
		grid-template-columns: repeat(var(--n), minmax(0, 1fr));
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.track {
		position: absolute;
		inset-block-start: calc(1rem - 1px);
		inset-inline: calc(50% / var(--n));
		block-size: 2px;
		border-radius: 1px;
		background: var(--ui-line);
		overflow: hidden;
	}
	/* Filled with a transform, so it moves smoothly even while the page is busy. */
	.fill {
		position: absolute;
		inset: 0;
		background: var(--ui-accent);
		transform: scaleX(var(--fill));
		transform-origin: left;
		transition: transform 450ms var(--ui-ease-out);
	}
	.fill:dir(rtl) {
		transform-origin: right;
	}
	li {
		display: flex;
		justify-content: center;
		min-inline-size: 0;
	}
	.step {
		display: grid;
		justify-items: center;
		gap: 0.375rem;
		max-inline-size: 100%;
		margin: 0;
		padding: 0 0.25rem;
		border: 0;
		border-radius: var(--ui-radius);
		background: none;
		color: inherit;
		font: inherit;
		text-align: center;
	}
	button.step {
		cursor: pointer;
	}
	button.step:focus-visible {
		outline: var(--ui-ring-width) solid var(--ui-ring);
		outline-offset: var(--ui-ring-offset);
	}
	.marker {
		position: relative;
		display: grid;
		place-items: center;
		inline-size: 2rem;
		block-size: 2rem;
		box-sizing: border-box;
		border-radius: 50%;
		background: var(--ui-surface);
		box-shadow: inset 0 0 0 2px var(--ui-control-line);
		color: var(--ui-muted);
		font-weight: 600;
		font-variant-numeric: tabular-nums;
		transition:
			background-color var(--ui-dur-overlay) ease,
			box-shadow var(--ui-dur-overlay) ease,
			color var(--ui-dur-overlay) ease,
			transform var(--ui-dur-press) var(--ui-ease-out);
	}
	.current .marker {
		box-shadow:
			inset 0 0 0 2px var(--ui-accent),
			0 0 0 4px color-mix(in srgb, var(--ui-accent) 18%, transparent);
		color: var(--ui-accent);
	}
	.done .marker {
		background: var(--ui-accent);
		box-shadow: none;
		color: var(--ui-on-accent);
	}
	@media (hover: hover) and (pointer: fine) {
		button.step:hover .marker {
			transform: scale(1.08);
		}
	}
	button.step:active .marker {
		transform: scale(0.94);
	}
	/* The tick pops in as a step is finished. */
	.tick {
		display: grid;
		transition:
			scale var(--ui-dur-overlay) var(--ui-ease-out),
			opacity var(--ui-dur-overlay) ease;
	}
	@starting-style {
		.tick {
			scale: 0.4;
			opacity: 0;
		}
	}
	.text {
		display: grid;
		min-inline-size: 0;
	}
	.name {
		overflow: hidden;
		color: var(--ui-muted);
		font-weight: 500;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.current .name,
	.done .name {
		color: var(--ui-fg);
	}
	.description {
		color: var(--ui-muted);
		font-size: 0.8125rem;
	}
	/* A step with something to fix: its marker and message in the danger color. */
	.error .marker,
	.error.done .marker {
		background: var(--ui-surface);
		box-shadow: inset 0 0 0 2px var(--ui-danger);
		color: var(--ui-danger);
	}
	.error.current .marker {
		box-shadow:
			inset 0 0 0 2px var(--ui-danger),
			0 0 0 4px color-mix(in srgb, var(--ui-danger) 18%, transparent);
	}
	.problem {
		color: var(--ui-danger);
	}

	/* Vertical: one step per row, marker on the start side with its name beside it. */
	.vertical .track,
	.vertical .count {
		display: none;
	}
	.vertical ol {
		grid-template-columns: minmax(0, 1fr);
		gap: 1.25rem;
	}
	.vertical li {
		position: relative;
		justify-content: flex-start;
	}
	.vertical .step {
		grid-template-columns: auto minmax(0, 1fr);
		align-items: start;
		justify-items: start;
		column-gap: 0.75rem;
		padding: 0;
		text-align: start;
	}
	.vertical .text {
		padding-block-start: 0.3125rem;
	}
	.vertical .name {
		white-space: normal;
	}
	/* The link runs from under this marker to the next one, and fills downwards when this step is done. */
	.link {
		display: none;
	}
	.vertical .link {
		position: absolute;
		inset-block: calc(2rem + 0.25rem) calc(-1.25rem + 0.25rem);
		inset-inline-start: calc(1rem - 1px);
		display: block;
		inline-size: 2px;
		border-radius: 1px;
		background: var(--ui-line);
		overflow: hidden;
	}
	.vertical .link::after {
		content: '';
		position: absolute;
		inset: 0;
		background: var(--ui-accent);
		transform: scaleY(0);
		transform-origin: top;
		transition: transform 450ms var(--ui-ease-out);
	}
	.vertical .done .link::after {
		transform: none;
	}
	/* Narrow: markers only, with the current step named in the count above (horizontal only). */
	@container (max-width: 34rem) {
		.horizontal .count {
			display: block;
		}
		/* Hidden from sight only: the step's name must still reach screen readers. */
		.horizontal .text {
			position: absolute;
			inline-size: 1px;
			block-size: 1px;
			overflow: hidden;
			clip-path: inset(50%);
			white-space: nowrap;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.fill,
		.vertical .link::after,
		.tick {
			transition: none;
		}
	}
	@media (forced-colors: active) {
		.current .marker,
		.done .marker {
			outline: 2px solid Highlight;
		}
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
