<script lang="ts" generics="T extends { id: string | number; label: string }">
	import { pop, reflow } from './motion';
	import { tick } from 'svelte';
	import { Cancel01Icon } from '@hugeicons/core-free-icons';
	import { announce } from './announce';
	import Icon from './Icon.svelte';

	interface Props {
		/** Names the group ("Filters"). */
		label: string;
		tags: T[];
		/** Makes tags removable, by their × or Backspace / Delete. */
		onremove?: (tag: T) => void;
		/** Shown when there are no tags. */
		empty?: string;
		class?: string;
	}

	let { label, tags, onremove, empty, class: className }: Props = $props();

	let list = $state<HTMLUListElement>();
	const tagEls = () => [...(list?.querySelectorAll<HTMLElement>('li:not([inert]) .x') ?? [])];

	async function remove(tag: T, at: number) {
		onremove?.(tag);
		announce(`${tag.label} removed`);
		// Focus stays in the group: the next tag, or the one before if it was the last.
		await tick();
		const left = tagEls();
		(left[Math.min(at, left.length - 1)] ?? list)?.focus();
	}

	function keys(e: KeyboardEvent, tag: T, i: number) {
		const els = tagEls();
		const rtl = getComputedStyle(e.currentTarget as Element).direction === 'rtl';
		const step = { ArrowRight: rtl ? -1 : 1, ArrowLeft: rtl ? 1 : -1, ArrowDown: 1, ArrowUp: -1 }[
			e.key
		];
		if (step) {
			e.preventDefault();
			els[(i + step + els.length) % els.length]?.focus();
		} else if (e.key === 'Home' || e.key === 'End') {
			e.preventDefault();
			els[e.key === 'Home' ? 0 : els.length - 1]?.focus();
		} else if (onremove && (e.key === 'Backspace' || e.key === 'Delete')) {
			e.preventDefault();
			remove(tag, i);
		}
	}
</script>

<ul bind:this={list} class={['tags', className]} aria-label={label} tabindex="-1">
	{#each tags as tag, i (tag.id)}
		<li animate:reflow out:pop={{ start: 0.85 }} in:pop={{ start: 0.85, duration: 180 }}>
			<span class="tag">
				{tag.label}
				{#if onremove}
					<!-- The × is the focus stop: arrows move between tags, Backspace or Delete removes. -->
					<button
						type="button"
						class="x"
						tabindex={i === 0 ? 0 : -1}
						aria-label="Remove {tag.label}"
						onkeydown={(e) => keys(e, tag, i)}
						onclick={() => remove(tag, i)}
						><Icon icon={Cancel01Icon} size={12} strokeWidth={2.5} /></button
					>
				{/if}
			</span>
		</li>
	{:else}
		{#if empty}<li class="empty">{empty}</li>{/if}
	{/each}
</ul>

<style>
	.tags {
		display: flex;
		flex-wrap: wrap;
		gap: 0.375rem;
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.tags:focus {
		outline: none;
	}
	.tag {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		padding: 0.3125rem 0.75rem;
		border-radius: 999px;
		background: var(--ui-subtle);
		color: var(--ui-fg);
		font: 500 0.8125rem/1.2 var(--ui-font);
	}
	.tag:has(.x) {
		padding-inline-end: 0.3125rem;
	}
	/* The whole tag rings when its × has focus. */
	.tag:has(.x:focus-visible) {
		outline: var(--ui-ring-width) solid var(--ui-ring);
		outline-offset: var(--ui-ring-offset);
	}
	.x:focus {
		outline: none;
	}
	.x {
		display: grid;
		place-items: center;
		inline-size: 1.25rem;
		block-size: 1.25rem;
		padding: 0;
		border: 0;
		border-radius: 50%;
		background: none;
		color: var(--ui-muted);
		cursor: pointer;
		transition: background var(--ui-dur) ease;
	}
	.x:hover {
		background: var(--ui-hover);
		color: var(--ui-fg);
	}
	@media (pointer: coarse) {
		/* A bigger target for fingers, without a bigger tag. */
		.x {
			position: relative;
		}
		.x::after {
			content: '';
			position: absolute;
			inset: -0.625rem;
		}
	}
	.empty {
		color: var(--ui-muted);
		font-size: 0.875rem;
	}
</style>
