<script lang="ts">
	import { announce } from '../../ui/announce.js';
	import Button from '../../ui/Button.svelte';
	import RollingNumber from '../../ui/RollingNumber.svelte';

	// "Send again", then a wait before it can be pressed again, counted down in seconds.
	let {
		onresend,
		cooldown = 60,
		label = 'Send again'
	}: { onresend: () => Promise<unknown> | unknown; cooldown?: number; label?: string } = $props();

	// svelte-ignore state_referenced_locally
	let left = $state(cooldown);
	let sending = $state(false);
	let failed = $state(false);

	$effect(() => {
		if (left <= 0) return;
		const t = setInterval(() => (left -= 1), 1000);
		return () => clearInterval(t);
	});

	async function send() {
		if (left > 0 || sending) return;
		sending = true;
		failed = false;
		try {
			await onresend();
			left = cooldown;
			announce('Sent again.');
		} catch {
			failed = true;
		} finally {
			sending = false;
		}
	}
	const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
</script>

<span class="resend">
	{#if left > 0}
		<span class="wait">
			{label} in <span aria-hidden="true"><RollingNumber value={clock(left)} /></span><span
				class="sr">{left} seconds</span
			>
		</span>
	{:else}
		<Button variant="link" loading={sending} onclick={send}>{label}</Button>
	{/if}
	{#if failed}<span class="error" role="alert">Couldn’t send. Try again.</span>{/if}
</span>

<style>
	.resend {
		display: inline-flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 0.5rem;
	}
	.wait {
		color: var(--ui-muted);
		font-variant-numeric: tabular-nums;
	}
	.error {
		color: var(--ui-danger);
		font-size: 0.875rem;
	}
	.sr {
		position: absolute;
		inline-size: 1px;
		block-size: 1px;
		overflow: hidden;
		clip-path: inset(50%);
		white-space: nowrap;
	}
</style>
