<script lang="ts" module>
	import type { InformationCircleIcon } from '@hugeicons/core-free-icons';

	export interface RadioCard {
		value: string;
		label: string;
		description?: string;
		/** Short text at the end: a price, a time. */
		detail?: string;
		icon?: typeof InformationCircleIcon;
		disabled?: boolean;
		/** Why it can't be chosen, shown in place of the description. */
		reason?: string;
	}
</script>

<script lang="ts">
	import Icon from './Icon.svelte';
	import { glide } from './glide';

	interface Props {
		/** The question the cards answer. */
		legend: string;
		options: RadioCard[];
		value?: string;
		/** Cards side by side, or one per row with the detail at the end. */
		layout?: 'grid' | 'list';
		name?: string;
		required?: boolean;
		disabled?: boolean;
		hint?: string;
		error?: string;
		class?: string;
	}

	const uid = $props.id();
	let {
		legend,
		options,
		value = $bindable(),
		layout = 'grid',
		name = uid,
		required = false,
		disabled = false,
		hint,
		error,
		class: className
	}: Props = $props();

	let cards: HTMLDivElement;
	let selection: HTMLSpanElement;
	// Pointer choices glide the selection over; keyboard ones and resizes snap, as the tabs do.
	let viaPointer = false;

	const place = (animate: boolean) =>
		glide(
			selection,
			value ? cards?.querySelector<HTMLElement>(`[data-value="${CSS.escape(value)}"]`) : null,
			animate,
			280
		);
	$effect(() => {
		void value;
		place(viaPointer);
	});
	$effect(() => {
		const seen = new ResizeObserver(() => place(false));
		seen.observe(cards);
		return () => seen.disconnect();
	});
</script>

<!-- fieldset + legend + native radios: the question is announced, arrow keys and forms come free. -->
<fieldset
	class={['radio-cards', layout === 'list' && 'list', className]}
	{disabled}
	aria-describedby={[hint && `${uid}-hint`, error && `${uid}-error`].filter(Boolean).join(' ') ||
		undefined}
	onkeydowncapture={() => (viaPointer = false)}
	onpointerdowncapture={() => (viaPointer = true)}
>
	<legend>{legend}</legend>
	{#if hint}<p id="{uid}-hint" class="hint">{hint}</p>{/if}
	<div class="cards" bind:this={cards}>
		<span class="selection" aria-hidden="true" bind:this={selection}></span>
		{#each options as o (o.value)}
			<label class="card" data-value={o.value}>
				<input
					type="radio"
					{name}
					value={o.value}
					bind:group={value}
					disabled={o.disabled}
					{required}
					data-invalid={error ? true : undefined}
					aria-describedby={o.description || o.reason ? `${uid}-${o.value}-desc` : undefined}
				/>
				{#if o.icon}<span class="icon"><Icon icon={o.icon} size={20} /></span>{/if}
				<span class="text">
					<span class="label">{o.label}</span>
					{#if o.description || o.reason}
						<span class="description" id="{uid}-{o.value}-desc"
							>{o.disabled && o.reason ? o.reason : o.description}</span
						>
					{/if}
				</span>
				{#if o.detail}<span class="detail">{o.detail}</span>{/if}
				<span class="mark" aria-hidden="true"></span>
			</label>
		{/each}
	</div>
	{#if error}<p id="{uid}-error" class="error">{error}</p>{/if}
</fieldset>

<style>
	.radio-cards {
		min-inline-size: 0;
		margin: 0;
		padding: 0;
		border: 0;
		color: var(--ui-fg);
		font: 0.9375rem/1.5 var(--ui-font);
	}
	legend {
		margin-block-end: 0.5rem;
		padding: 0;
		font-weight: 500;
	}
	.hint,
	.error {
		margin: 0;
		font-size: 0.8125rem;
	}
	.hint {
		margin-block: -0.25rem 0.5rem;
		color: var(--ui-muted);
	}
	.error {
		margin-block-start: 0.5rem;
		color: var(--ui-danger);
	}
	.cards {
		position: relative;
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(min(11rem, 100%), 1fr));
		gap: 0.5rem;
	}
	.list .cards {
		grid-template-columns: minmax(0, 1fr);
	}
	/* Cards are tinted, not outlined; the chosen one gets the accent layer that glides between them. */
	.card {
		position: relative;
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		grid-template-areas: 'text mark' 'detail detail';
		align-items: start;
		gap: 0.75rem 0.5rem;
		padding: 0.875rem 1rem;
		border: 1px solid transparent;
		border-radius: var(--ui-radius);
		background: var(--ui-subtle);
		cursor: pointer;
		transition: background-color var(--ui-dur-press) ease;
	}
	.card:has(.icon) {
		grid-template-columns: auto minmax(0, 1fr) auto;
		grid-template-areas: 'icon text mark' 'detail detail detail';
	}
	.list .card {
		grid-template-columns: minmax(0, 1fr) auto auto;
		grid-template-areas: 'text detail mark';
		align-items: center;
	}
	.list .card:has(.icon) {
		grid-template-columns: auto minmax(0, 1fr) auto auto;
		grid-template-areas: 'icon text detail mark';
	}
	@media (hover: hover) and (pointer: fine) {
		.card:not(:has(input:checked, input:disabled)):hover {
			background: var(--ui-hover);
		}
	}
	.card:has(input:checked) {
		background: transparent;
	}
	.card:has(input:focus-visible) {
		outline: var(--ui-ring-width) solid var(--ui-ring);
		outline-offset: var(--ui-ring-offset);
	}
	.card:has(input:disabled) {
		cursor: not-allowed;
	}
	.card:has(input:disabled) :is(.label, .detail, .icon, .mark) {
		opacity: 0.55;
	}
	.selection {
		position: absolute;
		top: 0;
		left: 0;
		transform-origin: 0 0;
		border-radius: var(--ui-radius);
		background: color-mix(in srgb, var(--ui-accent) 10%, var(--ui-surface));
		opacity: 0;
		pointer-events: none;
		transition: opacity var(--ui-dur) ease;
	}
	/* The native radio stays in the card for keyboard and forms, out of sight. */
	input {
		position: absolute;
		inset: 0;
		margin: 0;
		opacity: 0;
		cursor: inherit;
	}
	.icon {
		grid-area: icon;
		display: grid;
		color: var(--ui-muted);
		transition: color var(--ui-dur) ease;
	}
	.card:has(input:checked) .icon {
		color: var(--ui-accent);
	}
	.text {
		grid-area: text;
		display: grid;
		min-inline-size: 0;
	}
	.label {
		font-weight: 500;
	}
	.description {
		color: var(--ui-muted);
		font-size: 0.8125rem;
	}
	.detail {
		grid-area: detail;
		font-size: 1.125rem;
		font-weight: 600;
		font-variant-numeric: tabular-nums;
	}
	.list .detail {
		font-size: 0.9375rem;
	}
	/* The radio mark: an empty ring that fills with the accent, the dot popping in on the spring. */
	.mark {
		grid-area: mark;
		display: grid;
		place-items: center;
		box-sizing: border-box;
		inline-size: 1.125rem;
		block-size: 1.125rem;
		margin-block-start: 0.125rem;
		border: 2px solid light-dark(rgb(15 23 42 / 0.32), rgb(255 255 255 / 0.28));
		border-radius: 50%;
		transition: border-color var(--ui-dur) ease;
	}
	.list .mark {
		margin: 0;
	}
	.mark::after {
		content: '';
		inline-size: 0.5rem;
		block-size: 0.5rem;
		border-radius: 50%;
		background: var(--ui-accent);
		opacity: 0;
		scale: 0.4;
		transition:
			opacity var(--ui-dur-exit) ease,
			scale var(--ui-dur-exit) ease;
	}
	.card:has(input:checked) .mark {
		border-color: var(--ui-accent);
	}
	.card:has(input:checked) .mark::after {
		opacity: 1;
		scale: 1;
		transition:
			opacity var(--ui-dur) var(--ui-ease-out),
			scale var(--ui-dur-spring) var(--ui-ease-spring);
	}
	.card:has(input[data-invalid]) .mark {
		border-color: var(--ui-danger);
	}
	@media (prefers-reduced-motion: reduce) {
		.mark::after,
		.card:has(input:checked) .mark::after {
			scale: 1;
		}
	}
	@media (forced-colors: active) {
		.card:has(input:checked) {
			outline: 2px solid Highlight;
		}
	}
</style>
