<script lang="ts">
	import type { HTMLTextareaAttributes } from 'svelte/elements';

	interface Props extends Omit<HTMLTextareaAttributes, 'value' | 'children'> {
		label: string;
		value?: string | null;
		hint?: string;
		error?: string;
	}

	const uid = $props.id();
	let {
		label,
		value = $bindable(),
		hint,
		error,
		rows = 3,
		id = uid,
		class: className,
		...rest
	}: Props = $props();

	const describedby = $derived(
		[hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ') || undefined
	);
</script>

<div class={['field', className]}>
	<label for={id}>{label}</label>
	<textarea
		{id}
		{rows}
		style:--rows={rows}
		bind:value
		aria-invalid={error ? true : undefined}
		aria-describedby={describedby}
		{...rest}></textarea>
	{#if hint}<p id="{id}-hint" class="hint">{hint}</p>{/if}
	{#if error}<p id="{id}-error" class="error">{error}</p>{/if}
</div>

<style>
	.field {
		display: grid;
		gap: 0.25rem;
		font: 0.9375rem/1.5 var(--ui-font);
		color: var(--ui-fg);
	}
	label {
		font-weight: 500;
	}
	textarea {
		appearance: none;
		inline-size: 100%;
		margin: 0;
		padding: 0.5rem 0.75rem;
		box-sizing: border-box;
		border: 1px solid var(--ui-field-line);
		border-radius: var(--ui-radius);
		background: var(--ui-surface);
		color: inherit;
		/* 16px minimum: iOS Safari zooms the page into any smaller field on focus. */
		font: inherit;
		font-size: max(1rem, 16px);
		line-height: 1.5;
		box-shadow: none;
		resize: vertical;
		/* Grows with its text where supported; elsewhere it's a normal resizable box starting at `rows`. */
		field-sizing: content;
		min-block-size: calc(var(--rows, 3) * 1.5em + 1rem + 2px);
		max-block-size: 20rem;
	}
	textarea::placeholder {
		color: var(--ui-muted);
		opacity: 1;
	}
	textarea:focus-visible {
		outline: var(--ui-ring-width) solid var(--ui-ring);
		outline-offset: var(--ui-ring-offset);
	}
	textarea[aria-invalid='true']:focus-visible {
		outline-color: var(--ui-danger);
	}
	textarea[aria-invalid='true'] {
		border-color: var(--ui-danger);
	}
	textarea:disabled {
		background: var(--ui-subtle);
		opacity: 0.55;
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
