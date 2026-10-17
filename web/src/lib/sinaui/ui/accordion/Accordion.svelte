<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { setAccordion } from './context';

	interface Props extends HTMLAttributes<HTMLDivElement> {
		/** Only one item open at a time (native <details name>, no JavaScript). */
		exclusive?: boolean;
		children: Snippet;
	}

	let { exclusive = false, children, class: className, ...rest }: Props = $props();
	const id = $props.id();
	setAccordion({
		get name() {
			return exclusive ? id : undefined;
		}
	});
</script>

<div class={['accordion', className]} {...rest}>{@render children()}</div>

<style>
	/* Fills its column, so opening a section never changes its width. */
	.accordion {
		inline-size: 100%;
		font: 0.9375rem/1.5 var(--ui-font);
		color: var(--ui-fg);
	}
	/* Dividers between items only, no frame around the group (as shadcn/Radix do). Set here because
	   an item can't see its siblings. */
	.accordion > :global(* + *) {
		border-block-start: 1px solid var(--ui-field-line);
	}
</style>
