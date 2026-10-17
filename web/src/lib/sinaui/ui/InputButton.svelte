<script lang="ts">
	import type { HTMLButtonAttributes } from 'svelte/elements';
	import Icon from './Icon.svelte';

	type IconNode = Parameters<typeof Icon>[1]['icon'];

	interface Props extends HTMLButtonAttributes {
		/** Always named: it's an icon with no visible text. */
		'aria-label': string;
		icon: IconNode;
	}

	let { icon, class: className, ...rest }: Props = $props();
</script>

<!-- A small square button inside a field's box: show password, clear, copy. -->
<button type="button" class={['input-button', className]} {...rest}>
	<Icon {icon} size={16} />
</button>

<style>
	.input-button {
		display: grid;
		flex: none;
		place-items: center;
		inline-size: 2rem;
		block-size: 2rem;
		margin: 0;
		padding: 0;
		border: 1px solid transparent;
		border-radius: calc(var(--ui-radius-control) - 0.125rem);
		background: none;
		color: var(--ui-muted);
		cursor: pointer;
		transition:
			background-color var(--ui-dur-press) ease,
			color var(--ui-dur) ease,
			transform var(--ui-dur-press) var(--ui-ease-out);
	}
	@media (pointer: coarse) {
		.input-button {
			inline-size: 2.5rem;
			block-size: 2.5rem;
		}
	}
	@media (hover: hover) and (pointer: fine) {
		.input-button:hover {
			background: var(--ui-subtle);
			color: var(--ui-fg);
		}
	}
	.input-button:active {
		transform: scale(0.9);
	}
	.input-button:focus-visible {
		outline: var(--ui-ring-width) solid var(--ui-ring);
		outline-offset: 0;
	}
</style>
