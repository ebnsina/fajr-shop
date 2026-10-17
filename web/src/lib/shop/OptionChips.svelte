<script lang="ts">
	import { productPage as t } from '#lib/copy.js';

	// One product option as a row of compact chips (S, M, L...). Native radios underneath, so the
	// keyboard and screen readers treat it as one choice. A value that can't be bought is struck
	// through but still choosable, so shoppers can see what exists.
	let {
		legend,
		values,
		value = $bindable(),
		unavailable
	}: {
		legend: string;
		values: string[];
		value?: string;
		unavailable: (value: string) => 'sold_out' | 'not_offered' | null;
	} = $props();
	const name = $props.id();
</script>

<fieldset>
	<legend>{legend}: <strong>{value}</strong></legend>
	<div class="chips">
		{#each values as v (v)}
			{@const why = unavailable(v)}
			<label class={['chip', why && 'off']}>
				<input type="radio" {name} value={v} bind:group={value} />
				<span>{v}</span>
				{#if why}<span class="sr">({why === 'sold_out' ? t.soldOut : t.notOffered})</span>{/if}
			</label>
		{/each}
	</div>
</fieldset>

<style>
	fieldset {
		margin: 0;
		padding: 0;
		border: 0;
	}
	legend {
		margin-block-end: 0.5rem;
		padding: 0;
		font-size: 0.875rem;
		font-weight: 500;
	}
	legend strong {
		font-weight: 600;
	}
	.chips {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}
	.chip {
		position: relative;
		display: inline-grid;
		place-items: center;
		min-inline-size: 2.75rem;
		block-size: 2.25rem;
		padding-inline: 0.75rem;
		box-sizing: border-box;
		border: 1px solid var(--border-strong);
		border-radius: var(--ui-radius-control);
		background: var(--bg-surface);
		color: var(--text-primary);
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition:
			border-color var(--ui-dur-press) ease,
			background var(--ui-dur-press) ease;
	}
	.chip:hover {
		border-color: var(--brand-600);
	}
	.chip:has(input:checked) {
		border-color: var(--brand-600);
		background: var(--brand-50);
		color: var(--brand-700);
	}
	.chip:has(input:focus-visible) {
		outline: var(--ui-ring-width) solid var(--ui-ring);
		outline-offset: var(--ui-ring-offset);
	}
	/* Unavailable: struck through and dashed, not only paler. */
	.off {
		border-style: dashed;
		color: var(--text-disabled);
	}
	.off span:first-of-type {
		text-decoration: line-through;
	}
	input {
		position: absolute;
		opacity: 0;
		pointer-events: none;
	}
	.sr {
		position: absolute;
		inline-size: 1px;
		block-size: 1px;
		overflow: hidden;
		clip-path: inset(50%);
	}
</style>
