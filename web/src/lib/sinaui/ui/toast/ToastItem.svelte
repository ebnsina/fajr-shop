<script lang="ts">
	import { ease } from '../motion';
	import { AlertCircleIcon, Cancel01Icon, CheckmarkCircle02Icon } from '@hugeicons/core-free-icons';
	import Button from '../Button.svelte';
	import Icon from '../Icon.svelte';
	import { dismiss, type Toast } from './toast.svelte';

	let {
		toast: t,
		paused,
		height,
		muted = false,
		onmeasure,
		onfocuslost
	}: {
		toast: Toast;
		paused: boolean;
		/** Clamp to the front toast's height while stacked behind it. */
		height?: number;
		/** Hide the content while stacked behind: only the card's edge should peek out. */
		muted?: boolean;
		/** Reports the card's natural height, so the stack can lay itself out. */
		onmeasure: (height: number) => void;
		/** Called when this toast leaves while holding focus and no other toast can take it. */
		onfocuslost?: () => void;
	} = $props();

	let card: HTMLDivElement;

	// Removing the focused toast would drop focus to the top of the page (React Aria's useToastRegion):
	// hand it to the next toast along, or back to where the person was before the toasts.
	function close() {
		if (card.contains(document.activeElement)) {
			const li = card.closest('li');
			const near = [li?.previousElementSibling, li?.nextElementSibling]
				.filter((n): n is HTMLElement => !!n && !(n as HTMLElement).inert)
				.map((n) => n.querySelector<HTMLElement>('.close'))
				.find(Boolean);
			if (near) near.focus();
			else onfocuslost?.();
		}
		dismiss(t.id);
	}
	let inner = $state(0);

	// Swipe to dismiss, toward the edge the toasts sit on (Emil's drag recipe). The card is moved
	// directly, not through state, so a drag never re-renders anything.
	let drag: { id: number; x: number; t: number; dir: 1 | -1; dx: number } | undefined;

	function down(e: PointerEvent) {
		// One finger at a time; presses on Undo or ✕ stay presses.
		if (drag || e.button !== 0 || (e.target as Element).closest('button, a')) return;
		const dir = getComputedStyle(card).direction === 'rtl' ? -1 : 1;
		drag = { id: e.pointerId, x: e.clientX, t: performance.now(), dir, dx: 0 };
		card.setPointerCapture(e.pointerId);
	}

	function move(e: PointerEvent) {
		if (!drag || e.pointerId !== drag.id) return;
		const raw = (e.clientX - drag.x) * drag.dir;
		// Toward the edge it follows the finger; the other way it resists more the further it goes.
		drag.dx = raw >= 0 ? raw : -(Math.abs(raw) ** 0.6);
		card.style.translate = `${drag.dx * drag.dir}px 0`;
		card.style.opacity = String(1 - Math.min(Math.max(drag.dx, 0) / card.offsetWidth, 1) * 0.6);
	}

	function up(e: PointerEvent) {
		if (!drag || e.pointerId !== drag.id) return;
		const { dx, t: t0, dir } = drag;
		drag = undefined;
		const from = { translate: `${dx * dir}px 0`, opacity: card.style.opacity || '1' };
		card.style.translate = '';
		card.style.opacity = '';
		// A flick counts as much as a long drag.
		const velocity = Math.abs(dx) / (performance.now() - t0);
		if (dx > 80 || (dx > 10 && velocity > 0.11)) {
			card.animate([from, { translate: `${card.offsetWidth * dir}px 0`, opacity: 0 }], {
				duration: 200,
				easing: ease.standard,
				fill: 'forwards'
			}).onfinish = close;
		} else if (dx !== 0) {
			card.animate([from, { translate: '0 0', opacity: 1 }], {
				duration: 300,
				easing: ease.standard
			});
		}
	}
	$effect(() => {
		if (!inner) return;
		const cs = getComputedStyle(card);
		const frame = ['paddingTop', 'paddingBottom', 'borderTopWidth', 'borderBottomWidth'] as const;
		onmeasure(inner + frame.reduce((sum, k) => sum + parseFloat(cs[k]), 0));
	});

	// Counts down only while nobody is reading or reaching for it (WCAG 2.2.1).
	// svelte-ignore state_referenced_locally
	let remaining = t.duration;
	let started = 0;
	let timer: ReturnType<typeof setTimeout> | undefined;

	$effect(() => {
		if (paused) return;
		started = performance.now();
		timer = setTimeout(() => dismiss(t.id), remaining);
		return () => {
			clearTimeout(timer);
			remaining -= performance.now() - started;
		};
	});
</script>

<!-- Swiping is a pointer shortcut; the ✕ button is the keyboard and screen-reader way to dismiss. -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	bind:this={card}
	class={['toast', t.kind, muted && 'muted']}
	onpointerdown={down}
	onpointermove={move}
	onpointerup={up}
	onpointercancel={up}
	style:block-size={height ? `${height}px` : undefined}
>
	<div class="inner" bind:offsetHeight={inner}>
		{#if t.kind !== 'default'}
			<span class="icon">
				<Icon icon={t.kind === 'error' ? AlertCircleIcon : CheckmarkCircle02Icon} />
			</span>
		{/if}
		<div class="text">
			<!-- The kind in words too, so it isn't carried by color and icon alone. -->
			<p class="message">
				{#if t.kind !== 'default'}<span class="sr-only"
						>{t.kind === 'error' ? 'Error: ' : 'Success: '}</span
					>{/if}{t.message}
			</p>
			{#if t.description}<p class="description">{t.description}</p>{/if}
		</div>
		{#if t.action}
			<Button
				size="sm"
				variant="secondary"
				onclick={() => {
					t.action?.onclick();
					close();
				}}>{t.action.label}</Button
			>
		{/if}
		<button type="button" class="close" aria-label="Dismiss notification" onclick={close}>
			<Icon icon={Cancel01Icon} size={16} />
		</button>
	</div>
</div>

<style>
	.toast {
		/* Horizontal swipes are ours; vertical ones still scroll the page on touch screens. */
		touch-action: pan-y;
		box-sizing: border-box;
		inline-size: min(24rem, 100vw - 2rem);
		overflow: hidden;
		padding-block: 0.875rem;
		padding-inline: 1rem 0.875rem;
		/* Invisible normally; outlines it in Windows High Contrast. */
		border: 1px solid transparent;
		border-radius: calc(var(--ui-radius) * 1.5);
		background: var(--ui-surface-overlay);
		color: var(--ui-fg);
		font: 0.9375rem/1.45 var(--ui-font);
		box-shadow: var(--ui-shadow-overlay);
	}
	.inner {
		display: flex;
		align-items: flex-start;
		gap: 0.75rem;
		transition: opacity var(--ui-dur) ease;
	}
	.muted .inner {
		opacity: 0;
	}
	.icon {
		display: grid;
		flex: none;
		padding-block-start: 0.05rem;
	}
	.success .icon {
		color: var(--ui-accent);
	}
	.error .icon {
		color: var(--ui-danger);
	}
	.text {
		flex: 1;
		min-inline-size: 0;
	}
	.message,
	.description {
		margin: 0;
		overflow-wrap: anywhere;
	}
	.message {
		font-weight: 500;
	}
	.description {
		color: var(--ui-muted);
		font-size: 0.875rem;
	}
	.close {
		box-sizing: border-box;
		display: grid;
		flex: none;
		place-items: center;
		inline-size: 1.75rem;
		block-size: 1.75rem;
		margin-block: -0.125rem 0;
		margin-inline: 0 -0.25rem;
		border: 1px solid transparent;
		border-radius: var(--ui-radius);
		background: transparent;
		color: var(--ui-muted);
		cursor: pointer;
	}
	@media (pointer: coarse) {
		.close {
			inline-size: 2.75rem;
			block-size: 2.75rem;
			margin-block: -0.625rem;
		}
	}
	@media (hover: hover) and (pointer: fine) {
		.close:hover {
			background: var(--ui-subtle);
			color: var(--ui-fg);
		}
	}
	.close:focus-visible {
		outline: var(--ui-ring-width) solid var(--ui-ring);
		outline-offset: var(--ui-ring-offset);
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
