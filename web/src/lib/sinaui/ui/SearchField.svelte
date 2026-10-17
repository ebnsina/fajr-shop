<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';
	import { Cancel01Icon, Search01Icon } from '@hugeicons/core-free-icons';
	import Icon from './Icon.svelte';
	import Input from './Input.svelte';
	import InputButton from './InputButton.svelte';

	interface Props extends Omit<HTMLInputAttributes, 'value' | 'type' | 'children'> {
		label: string;
		/** Keeps the label for screen readers only. */
		hideLabel?: boolean;
		value?: string;
		hint?: string;
		/** Enter pressed: search for what's typed. */
		onsearch?: (query: string) => void;
		/** The input element, for focusing it from outside. */
		element?: HTMLInputElement;
	}

	let {
		label,
		value = $bindable(''),
		hint,
		onsearch,
		element = $bindable(),
		...rest
	}: Props = $props();

	function clear() {
		value = '';
		element?.focus();
	}
</script>

<Input
	{label}
	bind:value
	bind:element
	type="search"
	enterkeyhint="search"
	autocomplete="off"
	{hint}
	{...rest}
	onkeydown={(e) => {
		if (e.key === 'Escape' && value) {
			// Escape clears first; with nothing to clear it's left for a surrounding dialog.
			e.preventDefault();
			clear();
		} else if (e.key === 'Enter' && !e.isComposing) onsearch?.(value);
		rest.onkeydown?.(e);
	}}
>
	{#snippet start()}<Icon icon={Search01Icon} size={16} />{/snippet}
	{#snippet end()}
		<!-- Fades in once there's something to clear; hidden and out of Tab until then. -->
		<span class={['clear', value && 'shown']}>
			<InputButton
				icon={Cancel01Icon}
				aria-label="Clear search"
				tabindex={value ? 0 : -1}
				onclick={clear}
			/>
		</span>
	{/snippet}
</Input>

<style>
	.clear {
		display: flex;
		opacity: 0;
		scale: 0.8;
		pointer-events: none;
		transition:
			opacity var(--ui-dur) ease,
			scale var(--ui-dur) var(--ui-ease-out);
	}
	.clear.shown {
		opacity: 1;
		scale: 1;
		pointer-events: auto;
	}
	.clear:not(.shown) :global(button) {
		visibility: hidden;
		transition: visibility 0s var(--ui-dur);
	}
	@media (prefers-reduced-motion: reduce) {
		.clear {
			transition: none;
		}
	}
</style>
