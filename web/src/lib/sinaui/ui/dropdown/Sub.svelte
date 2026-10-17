<script lang="ts">
	import type { Snippet } from 'svelte';
	import { ArrowRight01Icon } from '@hugeicons/core-free-icons';
	import { getDropdown, setDropdown } from './context';
	import { anchored } from '../floating';
	import { glide } from '../glide';
	import Icon from '../Icon.svelte';
	import { scrollEdges } from '../scroll-edges';

	interface Props {
		/** The item that opens it ("Export as"). */
		label: string;
		/** Before the label: an icon. */
		start?: Snippet;
		children: Snippet;
	}

	let { label, start, children }: Props = $props();

	const id = $props.id();
	const root = getDropdown();
	// Choosing anything inside closes the whole menu, as it would from the top level.
	setDropdown({ close: () => root.close() });

	let open = $state(false);
	let item: HTMLButtonElement;
	let menu: HTMLDivElement;
	let highlight: HTMLSpanElement;
	let viaPointer = false;
	let focusFirst = false;

	// Beside its item, toward the reading end: right, or left in a right-to-left page.
	const place: { side: 'right' | 'left'; align: 'top'; gap: number } = {
		side: 'right',
		align: 'top',
		gap: 2
	};
	const float = anchored(
		() => item,
		() => menu,
		() => (open = false),
		place
	);
	const items = () =>
		[...menu.querySelectorAll<HTMLElement>('[role="menuitem"]')].filter(
			(el) => el.parentElement?.closest('[role="menu"]') === menu
		);

	$effect(() => {
		if (!open) {
			float.close();
			glide(highlight, null, false);
			return;
		}
		place.side = rtl() ? 'left' : 'right';
		float.open();
		if (focusFirst) items()[0]?.focus({ preventScroll: true });
		focusFirst = false;
	});
	$effect(() => () => float.destroy());

	// Pointing: opens after a moment and stays open while the pointer travels over to it.
	// Touch has no hover: a lifted finger fires pointerleave, which must not close what a tap opened.
	let timer: ReturnType<typeof setTimeout> | undefined;
	const later = (fn: () => void, ms: number) => {
		clearTimeout(timer);
		timer = setTimeout(fn, ms);
	};

	// Focus moving to another item of the parent menu closes this one.
	$effect(() => {
		const parent = item.parentElement?.closest<HTMLElement>('[role="menu"]');
		const onfocus = (e: FocusEvent) => {
			const t = e.target as HTMLElement;
			if (t !== item && !menu.contains(t) && t.parentElement?.closest('[role="menu"]') === parent)
				open = false;
		};
		// The parent menu closing (Tab, a choice elsewhere) takes this one with it.
		const ontoggle = (e: Event) => (e as ToggleEvent).newState === 'closed' && (open = false);
		parent?.addEventListener('focusin', onfocus);
		parent?.addEventListener('toggle', ontoggle);
		return () => {
			parent?.removeEventListener('focusin', onfocus);
			parent?.removeEventListener('toggle', ontoggle);
		};
	});

	const rtl = () => getComputedStyle(item).direction === 'rtl';
	function openKeys(e: KeyboardEvent) {
		const inward = rtl() ? 'ArrowLeft' : 'ArrowRight';
		if (e.key === inward || e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			e.stopPropagation();
			focusFirst = true;
			if (open) items()[0]?.focus();
			else open = true;
		}
	}
	function menuKeys(e: KeyboardEvent) {
		const list = items();
		const i = list.indexOf(document.activeElement as HTMLElement);
		const outward = rtl() ? 'ArrowRight' : 'ArrowLeft';
		let next: HTMLElement | undefined;
		if (e.key === 'ArrowDown') next = list[(i + 1) % list.length];
		else if (e.key === 'ArrowUp') next = list[(i - 1 + list.length) % list.length];
		else if (e.key === 'Home') next = list[0];
		else if (e.key === 'End') next = list.at(-1);
		else if (e.key === outward || e.key === 'Escape') {
			// Back to the item that opened it; the rest of the menu stays open.
			e.preventDefault();
			e.stopPropagation();
			open = false;
			item.focus();
			return;
		} else if (e.key === 'Tab') return;
		if (!next) return;
		e.preventDefault();
		e.stopPropagation();
		viaPointer = false;
		next.focus();
	}
</script>

<button
	bind:this={item}
	type="button"
	role="menuitem"
	tabindex="-1"
	class={['item', open && 'open']}
	aria-haspopup="menu"
	aria-expanded={open}
	aria-controls="{id}-menu"
	onkeydown={openKeys}
	onclick={() => {
		focusFirst = false;
		open = true;
	}}
	onpointermove={() => {
		if (document.activeElement !== item) item.focus({ preventScroll: true });
	}}
	onpointerenter={(e) => e.pointerType !== 'touch' && later(() => (open = true), 120)}
	onpointerleave={(e) => e.pointerType !== 'touch' && later(() => (open = false), 300)}
>
	{@render start?.()}
	<span class="label">{label}</span>
	<Icon icon={ArrowRight01Icon} size={16} class="chevron" />
</button>

<div
	bind:this={menu}
	id="{id}-menu"
	role="menu"
	tabindex="-1"
	aria-label={label}
	popover="manual"
	{@attach scrollEdges}
	data-fade-over
	class="menu"
	onkeydown={menuKeys}
	onpointerenter={() => clearTimeout(timer)}
	onpointerleave={(e) => e.pointerType !== 'touch' && later(() => (open = false), 300)}
	onpointermovecapture={() => (viaPointer = true)}
	onfocusin={(e) => {
		const el = (e.target as HTMLElement).closest<HTMLElement>('[role="menuitem"]');
		if (el && el.parentElement?.closest('[role="menu"]') === menu) glide(highlight, el, viaPointer);
	}}
>
	<span class="highlight" aria-hidden="true" bind:this={highlight}></span>
	{@render children()}
</div>

<style>
	.item {
		position: relative;
		box-sizing: border-box;
		display: flex;
		align-items: center;
		gap: 0.625rem;
		inline-size: 100%;
		min-block-size: 2.25rem;
		padding-block: 0;
		padding-inline: 0.625rem 0.375rem;
		border: 1px solid transparent;
		border-radius: calc(var(--ui-radius) - 0.25rem);
		background: transparent;
		color: inherit;
		font: inherit;
		text-align: start;
		white-space: nowrap;
		cursor: pointer;
		-webkit-tap-highlight-color: transparent;
	}
	@media (pointer: coarse) {
		.item {
			min-block-size: 2.75rem;
		}
	}
	.item:focus {
		outline: none;
	}
	/* Open: it keeps a faint mark while focus is in the submenu. */
	.item.open {
		background: var(--ui-subtle);
	}
	.label {
		flex: 1;
	}
	.item :global(svg) {
		color: var(--ui-muted);
	}
	.item :global(.chevron:dir(rtl)) {
		transform: scaleX(-1);
	}
	.highlight {
		position: absolute;
		top: 0;
		left: 0;
		transform-origin: 0 0;
		border-radius: calc(var(--ui-radius) - 0.25rem);
		background: var(--ui-subtle);
		opacity: 0;
		pointer-events: none;
		transition: opacity 120ms ease;
	}
	.menu {
		position: fixed;
		inset: auto;
		margin: 0;
		box-sizing: border-box;
		min-inline-size: 11rem;
		max-block-size: calc(100dvh - 16px);
		overflow: auto;
		padding: 0.25rem;
		border: 1px solid transparent;
		border-radius: var(--ui-radius);
		background: var(--ui-surface-overlay);
		color: var(--ui-fg);
		font: 0.9375rem/1.4 var(--ui-font);
		box-shadow: var(--ui-shadow-overlay);
	}
	@media (forced-colors: active) {
		.item:focus {
			outline: 2px solid Highlight;
		}
	}
</style>
