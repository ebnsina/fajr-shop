<script lang="ts">
	import { CheckmarkCircle02Icon } from '@hugeicons/core-free-icons';
	import { tick } from 'svelte';
	import { announce } from '../../ui/announce.js';
	import Alert from '../../ui/Alert.svelte';
	import Button from '../../ui/Button.svelte';
	import Icon from '../../ui/Icon.svelte';
	import OtpInput from '../../ui/OtpInput.svelte';
	import AuthCard from './AuthCard.svelte';
	import { toErrors } from './errors';
	import Resend from './Resend.svelte';

	interface Props {
		/** Check the code. Throw an Error with a code (e.g. "invalid_code", "code_expired") to say why not. */
		onsubmit: (code: string) => Promise<unknown> | unknown;
		/** Send a fresh code. */
		onresend?: () => Promise<unknown> | unknown;
		/** Where the code went, shown so people know where to look. */
		sentTo?: string;
		length?: number;
		cooldown?: number;
		title?: string;
	}

	let {
		onsubmit,
		onresend,
		sentTo,
		length = 6,
		cooldown = 60,
		title = 'Enter the code'
	}: Props = $props();

	let code = $state('');
	let error = $state<string>();
	let formError = $state<string>();
	let checking = $state(false);
	let done = $state(false);
	let heading = $state<HTMLElement>();

	// The message goes once they start typing the next try.
	$effect(() => {
		if (code) error = undefined;
	});

	// Sent as soon as the last box is filled; Verify is there for anyone who'd rather press it.
	async function submit() {
		if (checking || done) return;
		if (code.length < length) {
			error = `Enter all ${length} digits.`;
			return;
		}
		checking = true;
		error = formError = undefined;
		try {
			await onsubmit(code);
			done = true;
			announce('Verified.');
			await tick();
			heading?.focus();
		} catch (e) {
			const errors = toErrors(e);
			error = errors.code;
			formError = errors.form;
			// A wrong code is cleared, ready to type the right one.
			code = '';
		} finally {
			checking = false;
		}
	}
</script>

<AuthCard {title}>
	{#snippet description()}
		{#if sentTo}We sent a {length}-digit code to <strong>{sentTo}</strong>.{:else}We sent you a {length}-digit
			code.{/if}
	{/snippet}
	{#if done}
		<div class="done">
			<span class="icon" aria-hidden="true"><Icon icon={CheckmarkCircle02Icon} size={24} /></span>
			<p tabindex="-1" bind:this={heading}>Verified. You’re all set.</p>
		</div>
	{:else}
		<form
			class="fields"
			novalidate
			onsubmit={(e) => {
				e.preventDefault();
				submit();
			}}
		>
			{#if formError}<Alert tone="danger" title="Couldn’t check the code" live>{formError}</Alert
				>{/if}
			<OtpInput
				label="Code"
				name="code"
				{length}
				bind:value={code}
				{error}
				oncomplete={(c) => {
					code = c;
					submit();
				}}
			/>
			<Button type="submit" loading={checking}>Verify</Button>
			{#if onresend}
				<p class="resend">Didn’t get it? <Resend {cooldown} {onresend} /></p>
			{/if}
		</form>
	{/if}
</AuthCard>

<style>
	.fields,
	.done {
		display: grid;
		gap: 1rem;
	}
	.done {
		justify-items: start;
		animation: rise var(--ui-dur-spring) var(--ui-ease-enter) both;
	}
	@keyframes rise {
		from {
			opacity: 0;
			translate: 0 8px;
		}
	}
	.done p,
	.resend {
		margin: 0;
	}
	.done p:focus {
		outline: none;
	}
	.resend {
		color: var(--ui-muted);
		font-size: 0.875rem;
	}
	.icon {
		display: grid;
		place-items: center;
		inline-size: 3rem;
		block-size: 3rem;
		border-radius: 50%;
		background: color-mix(in srgb, var(--ui-accent) 12%, transparent);
		color: var(--ui-accent);
	}
	@media (prefers-reduced-motion: reduce) {
		.done {
			animation: none;
		}
	}
</style>
