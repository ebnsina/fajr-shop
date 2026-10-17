<script lang="ts">
	import { Tick02Icon } from '@hugeicons/core-free-icons';
	import type { Snippet } from 'svelte';
	import { announce } from './announce';
	import Button from './Button.svelte';
	import Morph from './Morph.svelte';

	interface Props {
		/** Runs on the second press. A promise keeps the button busy until it settles. */
		onconfirm: () => Promise<unknown> | unknown;
		children: Snippet;
		confirm?: string;
		done?: string;
		/** How long the question stays up, in milliseconds. */
		timeout?: number;
		/** Its color: a light tint at rest, solid once it asks. */
		variant?: 'danger' | 'primary';
		size?: 'sm' | 'md' | 'lg';
		class?: string;
	}

	let {
		onconfirm,
		children,
		confirm = 'Are you sure?',
		done = 'Done',
		timeout = 3000,
		variant = 'danger',
		size,
		class: className
	}: Props = $props();

	let status = $state<'idle' | 'asking' | 'working' | 'done'>('idle');
	let timer: ReturnType<typeof setTimeout>;
	$effect(() => () => clearTimeout(timer));

	function reset() {
		clearTimeout(timer);
		status = 'idle';
	}
	async function press() {
		if (status === 'idle') {
			status = 'asking';
			announce(`${confirm} Press again to confirm.`);
			timer = setTimeout(reset, timeout);
		} else if (status === 'asking') {
			clearTimeout(timer);
			status = 'working';
			try {
				await onconfirm();
				status = 'done';
				announce(done);
				timer = setTimeout(reset, 1600);
			} catch {
				reset();
			}
		}
	}
</script>

<Button
	variant={status === 'idle' ? 'ghost' : variant}
	{size}
	class={['confirm', `confirm-${variant}`, className].filter(Boolean).join(' ')}
	onclick={press}
	onkeydown={(e: KeyboardEvent) => e.key === 'Escape' && status === 'asking' && reset()}
	onblur={() => status === 'asking' && reset()}
>
	<Morph
		current={status}
		states={[
			{ key: 'idle', label: children },
			{ key: 'asking', text: confirm },
			{ key: 'working', spinner: true },
			{ key: 'done', text: done, icon: Tick02Icon }
		]}
	/>
</Button>

<style>
	/* At rest a light tint of its color, like Hold to confirm; asking, it turns solid. */
	:global(.btn.ghost.confirm) {
		--tone: var(--ui-danger);
		background: color-mix(in srgb, var(--tone) 12%, transparent);
		color: color-mix(in srgb, var(--tone) 85%, var(--ui-fg));
	}
	:global(.btn.ghost.confirm-primary) {
		--tone: var(--ui-accent);
	}
	@media (hover: hover) and (pointer: fine) {
		:global(.btn.ghost.confirm:hover) {
			background: color-mix(in srgb, var(--tone) 18%, transparent);
		}
	}
</style>
