<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLButtonAttributes } from 'svelte/elements';
	import { createAttachmentKey } from 'svelte/attachments';
	import { setDropdown } from './context';
	import { anchored } from '../floating';
	import { scrollEdges } from '../scroll-edges';
	import { glide } from '../glide';

	interface Props {
		open?: boolean;
		/** Render your trigger (usually a Button) and spread these props onto it. */
		trigger: Snippet<[HTMLButtonAttributes]>;
		/** Line the menu up with this instead of the trigger (a split button's whole shape). */
		anchor?: HTMLElement;
		children: Snippet;
		class?: string;
	}

	let { open = $bindable(false), trigger, anchor, children, class: className }: Props = $props();

	const id = $props.id();
	let button: HTMLElement;
	let menu: HTMLDivElement;
	let highlight: HTMLSpanElement;
	// Pointer moves glide the highlight; keyboard moves snap it.
	let viaPointer = false;
	// Keyboard opening lands on an item; a mouse click opens with nothing highlighted (React Aria).
	let focusOnOpen: 'first' | 'last' | 'menu' = 'first';

	// This menu's own items: a submenu's live inside it in the DOM but are navigated separately.
	const items = () =>
		[...menu.querySelectorAll<HTMLElement>('[role="menuitem"]')].filter(
			(el) => el.parentElement?.closest('[role="menu"]') === menu
		);

	/** Opens it, focusing the first item, the last, or the menu itself (a Menubar uses this). */
	export function show(at: 'first' | 'last' | 'menu') {
		focusOnOpen = at;
		open = true;
	}
	let instant = false;
	/** Closes at once, without the fade: a Menubar swapping to the next menu. */
	export function closeNow() {
		instant = true;
		open = false;
	}
	function close(returnFocus = true) {
		if (returnFocus && menu.contains(document.activeElement)) button.focus();
		open = false;
	}
	setDropdown({ close: () => close() });

	const float = anchored(
		() => anchor ?? button,
		() => menu,
		() => close(false)
	);

	$effect(() => {
		if (!open) {
			float.close(instant);
			instant = false;
			glide(highlight, null, false);
			return;
		}
		float.open();
		const list = items();
		const target = { first: list[0], last: list.at(-1), menu: menu }[focusOnOpen];
		target?.focus({ preventScroll: true });
	});
	$effect(() => () => float.destroy());

	function onkeydown(e: KeyboardEvent) {
		const list = items();
		const i = list.indexOf(document.activeElement as HTMLElement);
		const n = list.length;
		let next: HTMLElement | undefined;
		if (e.key === 'ArrowDown') next = list[(i + 1) % n];
		else if (e.key === 'ArrowUp') next = list[i < 0 ? n - 1 : (i - 1 + n) % n];
		else if (e.key === 'Home') next = list[0];
		else if (e.key === 'End') next = list[n - 1];
		else if (e.key === 'Escape' || e.key === 'Tab') {
			e.preventDefault();
			close();
			return;
		} else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
			// Typeahead: jump to the next item starting with the typed letter.
			const k = e.key.toLowerCase();
			const order = [...list.slice(i + 1), ...list.slice(0, i + 1)];
			next = order.find((el) => el.textContent?.trim().toLowerCase().startsWith(k));
		}
		if (!next) return;
		e.preventDefault();
		next.focus();
	}

	const triggerProps: HTMLButtonAttributes = $derived({
		id: `${id}-trigger`,
		'aria-haspopup': 'menu',
		'aria-expanded': open,
		'aria-controls': `${id}-menu`,
		// detail is 0 for Enter/Space, the click count for a pointer.
		onclick: (e: MouseEvent) => (open ? close() : show(e.detail ? 'menu' : 'first')),
		onkeydown: (e: KeyboardEvent) => {
			if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
				e.preventDefault();
				show(e.key === 'ArrowUp' ? 'last' : 'first');
			} else if (e.key === 'Escape' && open) close();
		},
		[createAttachmentKey()]: (el: HTMLElement) => {
			button = el;
		}
	});
</script>

{@render trigger(triggerProps)}

<!-- popover="manual": top layer (never clipped or buried), with dismissal handled here so the trigger toggles cleanly. -->
<div
	bind:this={menu}
	id="{id}-menu"
	role="menu"
	tabindex="-1"
	aria-labelledby="{id}-trigger"
	popover="manual"
	{@attach scrollEdges}
	data-fade-over
	class={['menu', className]}
	onkeydown={(e) => {
		viaPointer = false;
		onkeydown(e);
	}}
	// Capture phase: record the pointer before an item's own handler moves focus (and the highlight).
	onpointermovecapture={() => (viaPointer = true)}
	onfocusin={(e) => {
		const item = (e.target as HTMLElement).closest<HTMLElement>('[role="menuitem"]');
		// Focus inside a submenu leaves this highlight on the item that opened it.
		if (item && item.parentElement?.closest('[role="menu"]') !== menu) return;
		glide(highlight, item, viaPointer);
	}}
>
	<span class="highlight" aria-hidden="true" bind:this={highlight}></span>
	{@render children()}
</div>

<style>
	/* One highlight glides between items (see glide.ts). */
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
		min-inline-size: 12rem;
		max-block-size: calc(100dvh - 16px);
		overflow: auto;
		padding: 0.25rem;
		/* Invisible normally; outlines it in Windows High Contrast. */
		border: 1px solid transparent;
		border-radius: var(--ui-radius);
		background: var(--ui-surface-overlay);
		color: var(--ui-fg);
		font: 0.9375rem/1.4 var(--ui-font);
		box-shadow: var(--ui-shadow-overlay);
	}
</style>
