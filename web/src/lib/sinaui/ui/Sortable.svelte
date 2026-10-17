<script lang="ts" module>
	/** Spread onto the element people grab: a handle button, or the whole item. */
	export type HandleProps = {
		'data-sortable-handle': string;
		'aria-label': string;
		'aria-describedby': string;
		'aria-pressed': boolean;
		onpointerdown: (e: PointerEvent) => void;
		onkeydown: (e: KeyboardEvent) => void;
		onclick: (e: MouseEvent) => void;
	};
</script>

<script lang="ts" generics="T">
	import { ease, pop, reduced, reflow } from './motion';
	import { scrollEdges } from './scroll-edges';
	import { flushSync, tick, type Snippet } from 'svelte';
	import { announce } from './announce';

	interface Props {
		items: T[];
		/** A stable id for each item. */
		key: (item: T) => string | number;
		/** Names an item in announcements and on its handle ("Canon of Medicine"). */
		itemLabel: (item: T) => string;
		/** Names the list ("Reading list"). */
		label: string;
		/** list: one column. row: one line. grid: wraps; set its columns with --sortable-columns. */
		layout?: 'list' | 'row' | 'grid';
		/** Called after a move is dropped, with the new order. */
		onreorder?: (items: T[]) => void;
		children: Snippet<[T, HandleProps, { dragging: boolean; index: number }]>;
		class?: string;
	}

	let {
		items = $bindable(),
		key,
		itemLabel,
		label,
		layout = 'list',
		onreorder,
		children,
		class: className
	}: Props = $props();

	const uid = $props.id();
	let list: HTMLElement;

	// The item being moved, by pointer or keyboard, and where it started (for Escape).
	let active = $state<string | number>();
	let mode = $state<'pointer' | 'keyboard'>();
	let before: T[] = [];
	const indexOf = (id: string | number) => items.findIndex((i) => key(i) === id);
	const nodeOf = (id: string | number) =>
		list.querySelector<HTMLElement>(`[data-sortable-key="${CSS.escape(String(id))}"]`);
	const where = (i: number) => `position ${i + 1} of ${items.length}`;

	function moveTo(from: number, to: number) {
		if (from === to || to < 0 || to >= items.length) return;
		const next = [...items];
		next.splice(to, 0, ...next.splice(from, 1));
		items = next;
	}

	function pickUp(id: string | number, how: 'pointer' | 'keyboard') {
		before = [...items];
		active = id;
		mode = how;
		const i = indexOf(id);
		announce(
			how === 'keyboard'
				? `Picked up ${itemLabel(items[i])}, ${where(i)}. Arrow keys move it, Space drops it, Escape puts it back.`
				: `Picked up ${itemLabel(items[i])}.`,
			'assertive'
		);
	}
	function drop() {
		if (active === undefined) return;
		const i = indexOf(active);
		announce(`Dropped ${itemLabel(items[i])} at ${where(i)}.`, 'assertive');
		active = mode = undefined;
		onreorder?.(items);
	}
	function cancel() {
		if (active === undefined) return;
		const name = itemLabel(items[indexOf(active)]);
		items = before;
		active = mode = undefined;
		announce(`${name} put back.`, 'assertive');
	}

	// Moving a node in the DOM can drop its focus; put it back on the handle.
	async function refocus(id: string | number) {
		await tick();
		nodeOf(id)?.querySelector<HTMLElement>('[data-sortable-handle]')?.focus();
	}

	// Columns in the current layout, for Up/Down in a grid: items sharing the first one's top.
	function columns() {
		const nodes = [...list.children] as HTMLElement[];
		const top = nodes[0]?.offsetTop;
		return Math.max(1, nodes.filter((n) => n.offsetTop === top).length);
	}

	function keys(e: KeyboardEvent, id: string | number) {
		const picked = active === id && mode === 'keyboard';
		if (e.key === ' ' || e.key === 'Enter') {
			e.preventDefault();
			if (picked) drop();
			else if (active === undefined) pickUp(id, 'keyboard');
			return;
		}
		if (!picked) return;
		if (e.key === 'Escape') {
			e.preventDefault();
			cancel();
			refocus(id);
			return;
		}
		const rtl = getComputedStyle(list).direction === 'rtl';
		const cols = layout === 'grid' ? columns() : 1;
		const steps: Record<string, number> = {
			ArrowUp: layout === 'row' ? 0 : -cols,
			ArrowDown: layout === 'row' ? 0 : cols,
			ArrowLeft: layout === 'list' ? 0 : rtl ? 1 : -1,
			ArrowRight: layout === 'list' ? 0 : rtl ? -1 : 1,
			Home: -Infinity,
			End: Infinity
		};
		if (!(e.key in steps) || !steps[e.key]) return;
		e.preventDefault();
		const from = indexOf(id);
		const to = Math.min(items.length - 1, Math.max(0, from + steps[e.key]));
		if (to === from) return;
		// Applied at once and refocused at once, so a held or quickly repeated key never loses a press.
		flushSync(() => moveTo(from, to));
		nodeOf(id)?.querySelector<HTMLElement>('[data-sortable-handle]')?.focus();
		announce(`${where(to)}`, 'assertive');
	}

	// Pointer: mouse and pen lift after a few pixels; touch on a whole-item handle waits for a
	// short press, so a swipe still scrolls the page. A dedicated handle lifts at once on touch.
	let press:
		| {
				id: string | number;
				x: number;
				y: number;
				timer?: ReturnType<typeof setTimeout>;
				el: HTMLElement;
		  }
		| undefined;
	let drag: { grabX: number; grabY: number; x: number; y: number; frame: number } | undefined;
	let lastClickSuppressed = false;

	const local = (e: PointerEvent) => {
		const r = list.getBoundingClientRect();
		return { x: e.clientX - r.left + list.scrollLeft, y: e.clientY - r.top + list.scrollTop };
	};

	function down(e: PointerEvent, id: string | number) {
		if (e.button !== 0 || active !== undefined) return;
		const el = e.currentTarget as HTMLElement;
		press = { id, x: e.clientX, y: e.clientY, el };
		const wholeItem = el.hasAttribute('data-sortable-item');
		if (e.pointerType === 'touch' && wholeItem) {
			press.timer = setTimeout(() => begin(e), 220);
			// Once lifted, a moving finger drags instead of scrolling the page.
			el.addEventListener('touchmove', hold, { passive: false });
		}
		window.addEventListener('pointermove', move);
		window.addEventListener('pointerup', up);
		window.addEventListener('pointercancel', up);
	}

	function begin(e: PointerEvent) {
		if (!press) return;
		clearTimeout(press.timer);
		press.timer = undefined;
		const node = nodeOf(press.id);
		if (!node) return;
		try {
			press.el.setPointerCapture(e.pointerId);
		} catch {
			// The pointer is already gone: the drag still works without capture.
		}
		const p = local(e);
		drag = { grabX: p.x - node.offsetLeft, grabY: p.y - node.offsetTop, x: p.x, y: p.y, frame: 0 };
		pickUp(press.id, 'pointer');
		navigator.vibrate?.(8);
		follow();
	}

	function move(e: PointerEvent) {
		if (!press) return;
		if (!drag) {
			const far =
				Math.hypot(e.clientX - press.x, e.clientY - press.y) > (e.pointerType === 'touch' ? 8 : 4);
			if (!far) return;
			// A touch that moves before the press completes was a scroll: let it go.
			if (press.timer) return release();
			begin(e);
		}
		e.preventDefault();
		const p = local(e);
		drag!.x = p.x;
		drag!.y = p.y;
		autoscroll(e);
		// The slot whose center is nearest the dragged item's center is where it belongs.
		const node = nodeOf(press.id)!;
		const cx = p.x - drag!.grabX + node.offsetWidth / 2;
		const cy = p.y - drag!.grabY + node.offsetHeight / 2;
		let best = indexOf(press.id);
		let dist = Infinity;
		[...list.children].forEach((child, i) => {
			const c = child as HTMLElement;
			const d = Math.hypot(
				c.offsetLeft + c.offsetWidth / 2 - cx,
				c.offsetTop + c.offsetHeight / 2 - cy
			);
			if (d < dist) [dist, best] = [d, i];
		});
		moveTo(indexOf(press.id), best);
	}

	// Each frame, the lifted item sits under the pointer, wherever its slot has moved to.
	function follow() {
		if (!drag || !press) return;
		const node = nodeOf(press.id);
		if (node) {
			const dx = drag.x - drag.grabX - node.offsetLeft;
			const dy = drag.y - drag.grabY - node.offsetTop;
			node.style.transform = `translate(${dx}px, ${dy}px)${reduced() ? '' : ' scale(1.03)'}`;
		}
		drag.frame = requestAnimationFrame(follow);
	}

	// Near an edge of the list (or the window), it scrolls toward it.
	function autoscroll(e: PointerEvent) {
		const r = list.getBoundingClientRect();
		const edge = 40;
		const scrolls = list.scrollHeight > list.clientHeight || list.scrollWidth > list.clientWidth;
		const box = scrolls ? r : { top: 0, bottom: innerHeight, left: 0, right: innerWidth };
		const dy = e.clientY < box.top + edge ? -8 : e.clientY > box.bottom - edge ? 8 : 0;
		const dx = e.clientX < box.left + edge ? -8 : e.clientX > box.right - edge ? 8 : 0;
		if (!dx && !dy) return;
		if (scrolls) list.scrollBy(dx, dy);
		else scrollBy(dx, dy);
	}

	function up(e: PointerEvent) {
		if (drag && press) {
			cancelAnimationFrame(drag.frame);
			const node = nodeOf(press.id);
			lastClickSuppressed = true;
			if (e.type === 'pointercancel') cancel();
			else drop();
			// Settles into its slot from wherever it was let go.
			if (node) {
				const from = node.style.transform;
				node.style.transform = '';
				if (from && !reduced())
					node.animate([{ transform: from }, { transform: 'none' }], {
						duration: 220,
						easing: ease.standard
					});
			}
		}
		release();
	}

	const hold = (e: TouchEvent) => drag && e.preventDefault();

	function release() {
		if (press?.timer) clearTimeout(press.timer);
		press?.el.removeEventListener('touchmove', hold);
		press = undefined;
		drag = undefined;
		window.removeEventListener('pointermove', move);
		window.removeEventListener('pointerup', up);
		window.removeEventListener('pointercancel', up);
	}

	const handleFor = (item: T): HandleProps => {
		const id = key(item);
		return {
			'data-sortable-handle': '',
			'aria-label': `Move ${itemLabel(item)}`,
			'aria-describedby': `${uid}-how`,
			'aria-pressed': active === id && mode === 'keyboard',
			onpointerdown: (e) => down(e, id),
			onkeydown: (e) => keys(e, id),
			// A drag ends with a click on the handle; it shouldn't also count as one.
			onclick: (e) => {
				if (lastClickSuppressed) {
					e.preventDefault();
					e.stopImmediatePropagation();
					lastClickSuppressed = false;
				}
			}
		};
	};
</script>

<ul
	bind:this={list}
	{@attach scrollEdges}
	data-fade={layout === 'row' ? 'x' : undefined}
	class={['sortable', layout, active !== undefined && 'moving', className]}
	aria-label={label}
>
	{#each items as item, index (key(item))}
		{@const id = key(item)}
		<li
			data-sortable-key={id}
			class={['item', active === id && 'active', active === id && mode === 'pointer' && 'lifted']}
			animate:reflow={{ duration: active === id && mode === 'pointer' ? 0 : 200 }}
			out:pop={{ start: 0.9, duration: 160 }}
		>
			{@render children(item, handleFor(item), { dragging: active === id, index })}
		</li>
	{/each}
</ul>
<p id="{uid}-how" class="sr-only">
	Press Space to pick up, arrow keys to move, Space again to drop, Escape to cancel.
</p>

<style>
	.sortable {
		position: relative;
		display: flex;
		flex-direction: column;
		gap: var(--sortable-gap, 0.5rem);
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.row {
		flex-direction: row;
		flex-wrap: nowrap;
		overflow-x: auto;
	}
	.grid {
		display: grid;
		grid-template-columns: repeat(var(--sortable-columns, 3), minmax(0, 1fr));
	}
	.item {
		position: relative;
		touch-action: pan-y pan-x;
	}
	/* Held: above the rest, lifted off the page. */
	.lifted {
		z-index: 2;
		filter: drop-shadow(0 10px 18px rgb(0 0 0 / 0.16));
		will-change: transform;
	}
	.moving {
		cursor: grabbing;
		user-select: none;
		-webkit-user-select: none;
	}
	/* Picked up from the keyboard: marked in place. */
	.active:not(.lifted) {
		outline: var(--ui-ring-width) dashed var(--ui-ring);
		outline-offset: var(--ui-ring-offset);
		border-radius: var(--ui-radius);
	}
	.item :global([data-sortable-handle]) {
		cursor: grab;
		touch-action: none;
	}
	.item :global([data-sortable-item][data-sortable-handle]) {
		/* A whole-item handle keeps scrolling; the press-and-hold decides it's a drag. */
		touch-action: pan-y pan-x;
		-webkit-touch-callout: none;
	}
	.sr-only {
		position: absolute;
		inline-size: 1px;
		block-size: 1px;
		overflow: hidden;
		clip-path: inset(50%);
		white-space: nowrap;
	}
</style>
