<script lang="ts">
	import { reduced } from './motion';
	interface Props {
		label: string;
		value?: string;
		length?: number;
		/** Box groups, e.g. [3, 3] shows "123 · 456". */
		groups?: number[];
		/** 'numeric' codes take digits only; 'text' takes letters and digits. */
		mode?: 'numeric' | 'text';
		hint?: string;
		error?: string;
		name?: string;
		disabled?: boolean;
		/** Called once every box is filled. */
		oncomplete?: (code: string) => void;
	}

	let {
		label,
		value = $bindable(''),
		length = 6,
		groups,
		mode = 'numeric',
		hint,
		error,
		name,
		disabled = false,
		oncomplete
	}: Props = $props();

	const id = $props.id();
	let input: HTMLInputElement;
	let focused = $state(false);
	let box = $state<HTMLDivElement>();

	const clean = (s: string) =>
		(mode === 'numeric'
			? s.replace(/\D/g, '')
			: s.replace(/[^\p{L}\p{N}]/gu, '').toUpperCase()
		).slice(0, length);
	// Which box each index sits in, and where the group gaps fall.
	const breaks = $derived(
		(groups ?? []).reduce<number[]>((acc, g) => [...acc, (acc.at(-1) ?? 0) + g], []).slice(0, -1)
	);
	const active = $derived(Math.min(value.length, length - 1));

	// A new error shakes the boxes once: the code is wrong, try again.
	$effect(() => {
		if (!error || !box || reduced()) return;
		box.animate(
			[
				{ transform: 'translateX(0)' },
				{ transform: 'translateX(-6px)' },
				{ transform: 'translateX(5px)' },
				{ transform: 'translateX(-3px)' },
				{ transform: 'translateX(0)' }
			],
			{ duration: 320, easing: 'ease-out' }
		);
	});

	const describedby = $derived(
		[hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ') || undefined
	);
</script>

<div class="field">
	<label for="{id}-input">{label}</label>
	<div
		bind:this={box}
		class={['boxes', focused && 'focused', error && 'invalid', disabled && 'disabled']}
	>
		<!-- One real input under the boxes: typing, paste, SMS autofill and screen readers all see it. -->
		<input
			bind:this={input}
			id="{id}-input"
			{name}
			{value}
			type="text"
			inputmode={mode === 'numeric' ? 'numeric' : 'text'}
			autocomplete="one-time-code"
			autocapitalize="characters"
			spellcheck="false"
			maxlength={length}
			pattern={mode === 'numeric' ? `\\d{${length}}` : undefined}
			aria-describedby={describedby}
			aria-invalid={error ? true : undefined}
			{disabled}
			oninput={(e) => {
				const next = clean(e.currentTarget.value);
				e.currentTarget.value = next;
				value = next;
				if (next.length === length) oncomplete?.(next);
			}}
			onfocus={() => {
				focused = true;
				// Always type at the end: codes are entered in order.
				// Guarded: the field may be gone by the next frame.
				requestAnimationFrame(() => input?.setSelectionRange(value.length, value.length));
			}}
			onblur={() => (focused = false)}
		/>
		{#each Array.from({ length }, (_, i) => i) as i (i)}
			{#if breaks.includes(i)}<span class="gap" aria-hidden="true"></span>{/if}
			<span
				class={['slot', value[i] && 'filled', focused && i === active && 'active']}
				aria-hidden="true"
			>
				{#if value[i]}<span class="char">{value[i]}</span>{:else if focused && i === active}<span
						class="caret"
					></span>{/if}
			</span>
		{/each}
	</div>
	{#if hint}<p id="{id}-hint" class="hint">{hint}</p>{/if}
	{#if error}<p id="{id}-error" class="error">{error}</p>{/if}
</div>

<style>
	.field {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: 0.375rem;
		font: 0.9375rem/1.5 var(--ui-font);
		color: var(--ui-fg);
	}
	label {
		font-weight: 500;
	}
	.boxes {
		position: relative;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		inline-size: max-content;
		max-inline-size: 100%;
	}
	/* The input covers the boxes, invisible: clicks land in it, its caret and text are hidden. */
	input {
		position: absolute;
		inset: 0;
		z-index: 1;
		inline-size: 100%;
		margin: 0;
		padding: 0;
		border: 0;
		outline: none;
		background: transparent;
		color: transparent;
		caret-color: transparent;
		font-size: 16px;
		letter-spacing: 2rem;
		cursor: text;
	}
	input::selection {
		background: transparent;
	}
	.slot {
		display: grid;
		place-items: center;
		box-sizing: border-box;
		/* Shrinks on a phone rather than push the page sideways. */
		flex: 0 1 auto;
		inline-size: 3rem;
		min-inline-size: 1.75rem;
		block-size: 3.5rem;
		border: 1px solid var(--ui-field-line);
		border-radius: var(--ui-radius-control);
		background: var(--ui-surface);
		font-size: 1.375rem;
		font-weight: 600;
		font-variant-numeric: tabular-nums;
		transition:
			border-color var(--ui-dur-press) ease,
			box-shadow var(--ui-dur-press) ease;
	}
	/* The box being typed into gets the same focus ring as every other field. */
	.slot.active {
		outline: var(--ui-ring-width) solid var(--ui-ring);
		outline-offset: var(--ui-ring-offset);
	}
	.invalid .slot {
		border-color: var(--ui-danger);
	}
	.invalid .slot.active {
		outline-color: var(--ui-danger);
	}
	.disabled .slot {
		background: var(--ui-subtle);
		opacity: 0.55;
	}
	.gap {
		inline-size: 0.5rem;
		block-size: 2px;
		border-radius: 1px;
		background: var(--ui-control-line);
	}
	/* Each character pops in as it's typed. */
	.char {
		transition:
			scale 180ms var(--ui-ease-out),
			opacity 120ms ease;
	}
	@starting-style {
		.char {
			scale: 0.6;
			opacity: 0;
		}
	}
	.caret {
		inline-size: 2px;
		block-size: 1.5rem;
		border-radius: 1px;
		background: var(--ui-fg);
		animation: blink 1s steps(2, jump-none) infinite;
	}
	@keyframes blink {
		50% {
			opacity: 0;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.char {
			transition: none;
		}
		.caret {
			animation: none;
		}
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
	@media (forced-colors: active) {
		.slot.active {
			outline: 2px solid Highlight;
		}
	}
</style>
