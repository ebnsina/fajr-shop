<script lang="ts">
	import { CheckmarkCircle02Icon } from '@hugeicons/core-free-icons';
	import { tick } from 'svelte';
	import Alert from '../../ui/Alert.svelte';
	import Button from '../../ui/Button.svelte';
	import Icon from '../../ui/Icon.svelte';
	import PasswordInput from '../../ui/PasswordInput.svelte';
	import { createForm } from '../../ui/form.svelte.js';
	import AuthCard from './AuthCard.svelte';
	import { toErrors } from './errors';

	interface Props {
		/** Save the new password (your reset token travels with your own call). Throw an Error with a code (e.g. "link_expired") to say why not. */
		onsubmit: (password: string) => Promise<unknown> | unknown;
		signInHref?: string;
		minLength?: number;
	}

	let { onsubmit, signInHref, minLength = 10 }: Props = $props();

	let done = $state(false);
	let heading = $state<HTMLElement>();
	const form = createForm({
		messages: {
			password: {
				valueMissing: 'Choose a new password.',
				get tooShort() {
					return `Use at least ${minLength} characters.`;
				}
			},
			confirm: { valueMissing: 'Type the new password again.' }
		},
		validate: (data) => ({
			confirm:
				data.get('confirm') && data.get('confirm') !== data.get('password')
					? 'The two passwords don’t match.'
					: undefined
		}),
		async onsubmit(data) {
			try {
				await onsubmit(String(data.get('password')));
				done = true;
				await tick();
				heading?.focus();
			} catch (e) {
				return toErrors(e);
			}
		}
	});
</script>

<AuthCard
	title={done ? 'Password changed' : 'Choose a new password'}
	description={done ? undefined : 'You’ll use it to sign in from now on.'}
>
	{#if done}
		<div class="done">
			<span class="icon" aria-hidden="true"><Icon icon={CheckmarkCircle02Icon} size={24} /></span>
			<p tabindex="-1" bind:this={heading}>
				Your password is changed. Use it next time you sign in.
			</p>
			{#if signInHref}<Button href={signInHref}>Sign in</Button>{/if}
		</div>
	{:else}
		<form class="fields" {@attach form.attach}>
			{#if form.errors.form}
				<Alert tone="danger" title="Couldn’t change the password" live>{form.errors.form}</Alert>
			{/if}
			<PasswordInput
				label="New password"
				name="password"
				isNew
				required
				minlength={minLength}
				hint="At least {minLength} characters."
				error={form.errors.password}
			/>
			<PasswordInput
				label="Type it again"
				name="confirm"
				autocomplete="new-password"
				required
				error={form.errors.confirm}
			/>
			<Button type="submit" loading={form.submitting}>Change password</Button>
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
	.done p {
		margin: 0;
	}
	.done p:focus {
		outline: none;
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
