<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLInputAttributes } from 'svelte/elements';
	import { MinusSignIcon, Tick02Icon } from '@hugeicons/core-free-icons';
	import Icon from './Icon.svelte';

	interface Props extends Omit<HTMLInputAttributes, 'type' | 'checked' | 'children'> {
		checked?: boolean;
		/** "Some but not all": shows a dash and is announced as mixed. Cleared by the next click. */
		indeterminate?: boolean;
		/** Visible label. Without it, pass aria-label. */
		children?: Snippet;
		/** Secondary text under the label, read out as the description. */
		hint?: string;
		/** Error message; marks it invalid and is read out with it. */
		error?: string;
	}

	const uid = $props.id();
	let {
		checked = $bindable(false),
		indeterminate = $bindable(false),
		children,
		hint,
		error,
		id = uid,
		class: className,
		...rest
	}: Props = $props();
</script>

<!-- Native checkbox: keyboard, forms, reset and label clicks with no extra code. -->
<div class={['checkbox', className]}>
	<span class="control">
		<input
			type="checkbox"
			{id}
			bind:checked
			bind:indeterminate
			aria-invalid={error ? true : undefined}
			aria-describedby={[hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ') ||
				undefined}
			{...rest}
		/>
		<span class="box" aria-hidden="true">
			<span class="mark tick"><Icon icon={Tick02Icon} size={14} strokeWidth={2.5} /></span>
			<span class="mark dash"><Icon icon={MinusSignIcon} size={14} strokeWidth={2.5} /></span>
		</span>
	</span>
	{#if children || hint || error}
		<span class="text">
			{#if children}<label for={id}>{@render children()}</label>{/if}
			{#if hint}<span id="{id}-hint" class="hint">{hint}</span>{/if}
			{#if error}<span id="{id}-error" class="error">{error}</span>{/if}
		</span>
	{/if}
</div>

<style>
	.checkbox {
		display: inline-flex;
		align-items: flex-start;
		gap: 0.625rem;
		font: 0.9375rem/1.5 var(--ui-font);
		color: var(--ui-fg);
	}
	.control {
		position: relative;
		display: grid;
		flex: none;
		/* Box centered on the first line of the label. */
		block-size: 1.5em;
		place-items: center;
	}
	/* Real input over the box: clicks, touch and screen-reader focus land on the control itself. */
	input {
		position: absolute;
		inset: 50% auto auto 50%;
		translate: -50% -50%;
		z-index: 1;
		inline-size: 2.75rem;
		block-size: 2.75rem;
		margin: 0;
		opacity: 0;
		cursor: pointer;
	}
	.box {
		position: relative;
		display: grid;
		place-items: center;
		inline-size: 1.125rem;
		block-size: 1.125rem;
		box-sizing: border-box;
		border: 1px solid var(--ui-control-line);
		border-radius: calc(var(--ui-radius) / 2);
		background: var(--ui-surface);
		color: var(--ui-on-accent);
		transition:
			background-color var(--ui-dur-press) ease,
			border-color var(--ui-dur-press) ease,
			scale var(--ui-dur-press) var(--ui-ease-out);
	}
	.mark {
		position: absolute;
		display: grid;
		opacity: 0;
		scale: 0.6;
		transition:
			opacity var(--ui-dur-press) var(--ui-ease-out),
			scale var(--ui-dur-press) var(--ui-ease-out);
	}
	input:checked + .box,
	input:indeterminate + .box {
		border-color: var(--ui-accent);
		background: var(--ui-accent);
	}
	input:checked:not(:indeterminate) + .box .tick,
	input:indeterminate + .box .dash {
		opacity: 1;
		scale: 1;
	}
	input:active:not(:disabled) + .box {
		scale: 0.92;
	}
	input:focus-visible + .box {
		outline: var(--ui-ring-width) solid var(--ui-ring);
		outline-offset: var(--ui-ring-offset);
	}
	.text {
		display: grid;
	}
	label {
		cursor: pointer;
	}
	.hint,
	.error {
		font-size: 0.8125rem;
	}
	.hint {
		color: var(--ui-muted);
	}
	.error {
		color: var(--ui-danger);
	}
	input[aria-invalid='true']:not(:checked) + .box {
		border-color: var(--ui-danger);
	}
	input[aria-invalid='true']:focus-visible + .box {
		outline-color: var(--ui-danger);
	}
	/* Dim the control and label only: a hint often explains why it's unavailable, so it stays readable. */
	.checkbox:has(input:disabled) :is(.control, label) {
		opacity: 0.55;
	}
	.checkbox:has(input:disabled) :is(input, label) {
		cursor: not-allowed;
	}

	@media (prefers-reduced-motion: reduce) {
		.mark {
			scale: 1;
			transition: opacity var(--ui-dur-press) ease;
		}
		input:active + .box {
			scale: none;
		}
	}
	@media (forced-colors: active) {
		input:checked + .box,
		input:indeterminate + .box {
			background: Highlight;
			color: HighlightText;
		}
	}
</style>
