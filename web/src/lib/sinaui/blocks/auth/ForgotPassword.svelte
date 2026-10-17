<script lang="ts">
	import { MailOpen01Icon } from '@hugeicons/core-free-icons';
	import { tick } from 'svelte';
	import Alert from '../../ui/Alert.svelte';
	import Button from '../../ui/Button.svelte';
	import Icon from '../../ui/Icon.svelte';
	import Input from '../../ui/Input.svelte';
	import { createForm } from '../../ui/form.svelte.js';
	import AuthCard from './AuthCard.svelte';
	import { toErrors } from './errors';
	import Resend from './Resend.svelte';

	interface Props {
		/** Send the reset link. Throw an Error with a code (e.g. "too_many_attempts") to say why not. */
		onsubmit: (email: string) => Promise<unknown> | unknown;
		signInHref?: string;
		/** Seconds before the link can be sent again. */
		cooldown?: number;
	}

	let { onsubmit, signInHref, cooldown = 60 }: Props = $props();

	let sentTo = $state<string>();
	let heading = $state<HTMLElement>();
	const form = createForm({
		messages: {
			email: {
				valueMissing: 'Enter your email address.',
				typeMismatch: 'Enter an email address like name@example.com.'
			}
		},
		async onsubmit(data) {
			const email = String(data.get('email')).trim();
			try {
				await onsubmit(email);
				sentTo = email;
				// The form is gone; focus moves to what replaced it, so it's read out.
				await tick();
				heading?.focus();
			} catch (e) {
				return toErrors(e);
			}
		}
	});
</script>

{#snippet back()}<a href={signInHref}>Back to sign in</a>{/snippet}

<AuthCard
	title={sentTo ? 'Check your email' : 'Reset your password'}
	description={sentTo ? undefined : 'We’ll email you a link to choose a new one.'}
	footer={signInHref ? back : undefined}
>
	{#if sentTo}
		<div class="sent">
			<span class="icon" aria-hidden="true"><Icon icon={MailOpen01Icon} size={24} /></span>
			<p tabindex="-1" bind:this={heading}>
				If there’s an account for <strong>{sentTo}</strong>, a link to reset the password is on its
				way. It works for an hour.
			</p>
			<p class="muted">
				Nothing yet? Check spam, or <Resend {cooldown} onresend={() => onsubmit(sentTo!)} />
			</p>
			<Button variant="ghost" onclick={() => (sentTo = undefined)}>Use a different email</Button>
		</div>
	{:else}
		<form class="fields" {@attach form.attach}>
			{#if form.errors.form}
				<Alert tone="danger" title="Couldn’t send the link" live>{form.errors.form}</Alert>
			{/if}
			<Input
				label="Email"
				name="email"
				type="email"
				autocomplete="username"
				required
				error={form.errors.email}
			/>
			<Button type="submit" loading={form.submitting}>Send reset link</Button>
		</form>
	{/if}
</AuthCard>

<style>
	.fields,
	.sent {
		display: grid;
		gap: 1rem;
	}
	/* The confirmation rises in where the form was. */
	.sent {
		justify-items: start;
		animation: rise var(--ui-dur-spring) var(--ui-ease-enter) both;
	}
	@keyframes rise {
		from {
			opacity: 0;
			translate: 0 8px;
		}
	}
	.sent p {
		margin: 0;
	}
	.sent p:focus {
		outline: none;
	}
	.muted {
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
		.sent {
			animation: none;
		}
	}
</style>
