<script lang="ts">
	import Star from '@lucide/svelte/icons/star';
	import { reviewCopy as r } from '#lib/copy.js';

	// A 1–5 star choice as native radios: arrow keys, forms and screen readers work as they do anywhere.
	let { name, value = 0, error }: { name: string; value?: number; error?: string } = $props();
	const id = $props.id();
</script>

<fieldset class="stars" aria-describedby={error ? `${id}-error` : undefined}>
	<legend>{r.rating}</legend>
	<div class="row">
		{#each [1, 2, 3, 4, 5] as n (n)}
			<label>
				<input type="radio" {name} value={n} checked={n === value} required />
				<Star size={26} aria-hidden="true" />
				<span class="sr">{r.starsLabel(n)}</span>
			</label>
		{/each}
	</div>
	{#if error}<p id="{id}-error" class="error">{error}</p>{/if}
</fieldset>

<style>
	.stars {
		margin: 0;
		padding: 0;
		border: 0;
	}
	legend {
		margin-block-end: 0.375rem;
		padding: 0;
		font-size: 0.875rem;
		font-weight: 500;
	}
	.row {
		display: inline-flex;
		gap: 0.125rem;
	}
	label {
		display: grid;
		padding: 0.125rem;
		border-radius: 0.375rem;
		color: var(--border-strong);
		cursor: pointer;
	}
	/* The chosen star and those before it fill; while pointing, the hovered one and those before. */
	label:has(input:checked),
	label:has(~ label input:checked),
	.row:hover label:hover,
	.row:hover label:has(~ label:hover) {
		color: var(--star);
	}
	.row:hover label:not(:hover):not(:has(~ label:hover)) {
		color: var(--border-strong);
	}
	label :global(svg) {
		fill: currentColor;
	}
	label:has(input:focus-visible) {
		outline: var(--ui-ring-width) solid var(--ui-ring);
		outline-offset: 1px;
	}
	input,
	.sr {
		position: absolute;
		inline-size: 1px;
		block-size: 1px;
		overflow: hidden;
		clip-path: inset(50%);
		opacity: 0;
	}
	.error {
		margin: 0.375rem 0 0;
		color: var(--danger-700);
		font-size: 0.8125rem;
	}
</style>
