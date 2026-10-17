<script lang="ts">
	import { Add01Icon, MinusSignIcon } from '@hugeicons/core-free-icons';
	import { announce } from './announce';
	import Icon from './Icon.svelte';
	import RollingNumber from './RollingNumber.svelte';

	interface Props {
		label: string;
		value?: number;
		min?: number;
		max?: number;
		step?: number;
		/** Intl.NumberFormat options: currency, percent, units, decimals. */
		format?: Intl.NumberFormatOptions;
		/** Fixed, so server and browser render the same text; also sets the digits read and written. */
		locale?: string;
		hint?: string;
		error?: string;
		/** Form field name: a hidden input carries the plain number. */
		name?: string;
		disabled?: boolean;
	}

	let {
		label,
		value = $bindable(),
		min,
		max,
		step = 1,
		format,
		locale = 'en',
		hint,
		error,
		name,
		disabled = false
	}: Props = $props();

	const id = $props.id();
	const nf = $derived(new Intl.NumberFormat(locale, format));
	const show = (n: number | undefined) => (n === undefined ? '' : nf.format(n));
	// Wide enough for the longest value it can hold, and no wider; fixed, so typing never resizes it.
	const chars = $derived(
		min !== undefined && max !== undefined
			? Math.max(show(min).length, show(max).length, show(value).length) + 1
			: 6
	);
	let text = $state(show(value));

	/**
	 * Reads what was typed in the locale's own writing: its digits (Bangla, Arabic...), decimal mark and
	 * grouping, ignoring currency signs and units. Percent input "15" means 15%.
	 */
	function parse(input: string): number | undefined {
		const parts = nf.formatToParts(-12345.6);
		const group = parts.find((p) => p.type === 'group')?.value ?? ',';
		const decimal = parts.find((p) => p.type === 'decimal')?.value ?? '.';
		const digits = new Intl.NumberFormat(locale, { useGrouping: false })
			.format(9876543210)
			.split('')
			.reverse();
		let s = input.trim();
		for (let d = 0; d <= 9; d++) s = s.replaceAll(digits[d], String(d));
		s = s.replaceAll(group, '').replaceAll(decimal, '.').replace(/[−–]/g, '-');
		s = s.replace(/[^\d.-]/g, '');
		if (!s || s === '-' || s === '.') return undefined;
		const n = Number(s);
		if (!Number.isFinite(n)) return undefined;
		return format?.style === 'percent' ? n / 100 : n;
	}

	// Steps snap to the grid the step makes from min (or 0), without floating-point dust.
	const places = $derived(
		(String(step).split('.')[1] ?? '').length + (format?.style === 'percent' ? 2 : 0)
	);
	function tidy(n: number) {
		const base = min ?? 0;
		const snapped = Math.round((n - base) / step) * step + base;
		const clamped = Math.min(max ?? Infinity, Math.max(min ?? -Infinity, snapped));
		return Number(clamped.toFixed(places));
	}

	// Typing shows the input as it is; stepping shows the value rolling into place over it.
	let typing = $state(false);
	// A value set from outside (a slider beside it, a form reset) shows here, unless someone is typing.
	$effect.pre(() => {
		const v = value;
		if (!typing) text = show(v);
	});

	function set(n: number | undefined, say = false) {
		typing = false;
		value = n === undefined ? undefined : tidy(n);
		text = show(value);
		if (say && value !== undefined) announce(show(value));
	}
	function commit() {
		const n = parse(text);
		set(n);
	}
	function by(amount: number, say = false) {
		const current = parse(text) ?? value;
		set(current === undefined ? (amount > 0 ? (min ?? 0) : (max ?? 0)) : current + amount, say);
	}

	const atMin = $derived(min !== undefined && value !== undefined && value <= min);
	const atMax = $derived(max !== undefined && value !== undefined && value >= max);

	// Press and hold: one step now, then repeats that speed up, as React Aria's stepper does.
	let timer: ReturnType<typeof setTimeout> | undefined;
	function hold(amount: number, delay = 400) {
		by(amount);
		timer = setTimeout(() => hold(amount, Math.max(40, delay * 0.7)), delay);
	}
	function release() {
		clearTimeout(timer);
		if (value !== undefined) announce(show(value));
	}
	$effect(() => () => clearTimeout(timer));

	const describedby = $derived(
		[hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ') || undefined
	);
</script>

<div class="field" style:--chars="{chars}ch">
	<label for="{id}-input">{label}</label>
	<div class="control">
		<button
			type="button"
			class="step"
			tabindex="-1"
			aria-label="Decrease {label}"
			aria-controls="{id}-input"
			aria-disabled={disabled || atMin || undefined}
			onpointerdown={(e) => {
				if (e.button !== 0 || disabled || atMin) return;
				e.preventDefault();
				hold(-step);
			}}
			onpointerup={release}
			onpointerleave={() => clearTimeout(timer)}
			onpointercancel={() => clearTimeout(timer)}
			onclick={(e) => {
				// Keyboard or screen-reader activation: no pointerdown came first.
				if (e.detail === 0 && !disabled && !atMin) by(-step, true);
			}}><Icon icon={MinusSignIcon} size={16} /></button
		>
		<span class={['well', !typing && value !== undefined && 'rolling']}>
			<input
				id="{id}-input"
				type="text"
				inputmode={format?.maximumFractionDigits === 0 || Number.isInteger(step)
					? 'numeric'
					: 'decimal'}
				autocomplete="off"
				spellcheck="false"
				aria-roledescription="Number field"
				aria-invalid={error ? true : undefined}
				aria-describedby={describedby}
				{disabled}
				bind:value={text}
				oninput={() => (typing = true)}
				onblur={commit}
				onkeydown={(e) => {
					const keys: Record<string, () => void> = {
						ArrowUp: () => by(step),
						ArrowDown: () => by(-step),
						PageUp: () => by(step * 10),
						PageDown: () => by(-step * 10),
						Home: () => min !== undefined && set(min),
						End: () => max !== undefined && set(max),
						Enter: commit
					};
					if (!keys[e.key] || e.isComposing) return;
					e.preventDefault();
					keys[e.key]();
				}}
			/>
			<span class="display" aria-hidden="true"><RollingNumber value={text} /></span>
		</span>
		<button
			type="button"
			class="step"
			tabindex="-1"
			aria-label="Increase {label}"
			aria-controls="{id}-input"
			aria-disabled={disabled || atMax || undefined}
			onpointerdown={(e) => {
				if (e.button !== 0 || disabled || atMax) return;
				e.preventDefault();
				hold(step);
			}}
			onpointerup={release}
			onpointerleave={() => clearTimeout(timer)}
			onpointercancel={() => clearTimeout(timer)}
			onclick={(e) => {
				if (e.detail === 0 && !disabled && !atMax) by(step, true);
			}}><Icon icon={Add01Icon} size={16} /></button
		>
	</div>
	{#if name}<input type="hidden" {name} value={value ?? ''} />{/if}
	{#if hint}<p id="{id}-hint" class="hint">{hint}</p>{/if}
	{#if error}<p id="{id}-error" class="error">{error}</p>{/if}
</div>

<style>
	.field {
		display: grid;
		/* As wide as the control, so layouts (and example frames) can place it. */
		inline-size: max-content;
		max-inline-size: 100%;
		gap: 0.25rem;
		font: 0.9375rem/1.5 var(--ui-font);
		color: var(--ui-fg);
	}
	label {
		font-weight: 500;
	}
	/* One box like Input: minus, the number, plus. */
	/* Fits its contents: a longer hint or label below never stretches the box. */
	.control {
		display: flex;
		inline-size: max-content;
		align-items: stretch;
		box-sizing: border-box;
		min-block-size: 2.5rem;
		border: 1px solid var(--ui-field-line);
		border-radius: var(--ui-radius-control);
		background: var(--ui-surface);
	}
	@media (pointer: coarse) {
		.control {
			min-block-size: 2.75rem;
		}
	}
	.control:has(input:focus-visible) {
		outline: var(--ui-ring-width) solid var(--ui-ring);
		outline-offset: var(--ui-ring-offset);
	}
	.control:has(input[aria-invalid='true']) {
		border-color: var(--ui-danger);
		outline-color: var(--ui-danger);
	}
	.control:has(input:disabled) {
		background: var(--ui-subtle);
		opacity: 0.55;
	}
	.well {
		position: relative;
		display: flex;
		flex: none;
		inline-size: calc(var(--chars) + 0.5rem);
		min-inline-size: 0;
	}
	/* The rolling copy sits exactly over the input's own text, which hides beneath it. */
	.display {
		position: absolute;
		inset: 0;
		display: none;
		place-items: center;
		font-size: max(1rem, 16px);
		pointer-events: none;
	}
	.rolling .display {
		display: grid;
	}
	.rolling input {
		color: transparent;
		caret-color: var(--ui-fg);
	}
	input {
		flex: 1;
		min-inline-size: 0;
		margin: 0;
		padding: 0 0.25rem;
		border: 0;
		outline: none;
		background: none;
		color: inherit;
		font: inherit;
		font-size: max(1rem, 16px);
		font-variant-numeric: tabular-nums;
		text-align: center;
	}
	.step {
		display: grid;
		flex: none;
		place-items: center;
		inline-size: 2.5rem;
		margin: 0.25rem;
		padding: 0;
		border: 1px solid transparent;
		border-radius: calc(var(--ui-radius-control) - 0.25rem);
		background: none;
		color: var(--ui-muted);
		cursor: pointer;
		touch-action: manipulation;
		transition:
			background-color var(--ui-dur-press) ease,
			color var(--ui-dur) ease,
			transform var(--ui-dur-press) var(--ui-ease-out);
	}
	@media (hover: hover) and (pointer: fine) {
		.step:not([aria-disabled='true']):hover {
			background: var(--ui-subtle);
			color: var(--ui-fg);
		}
	}
	.step:active:not([aria-disabled='true']) {
		transform: scale(0.9);
	}
	.step[aria-disabled='true'] {
		opacity: 0.4;
		cursor: not-allowed;
	}
	.hint,
	.error {
		margin: 0;
		font-size: 0.8125rem;
	}
	.hint {
		color: var(--ui-muted);
	}
	.error {
		color: var(--ui-danger);
	}
</style>
