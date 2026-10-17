<script lang="ts">
	import Alert from '../../ui/Alert.svelte';
	import Button from '../../ui/Button.svelte';
	import Checkbox from '../../ui/Checkbox.svelte';
	import Input from '../../ui/Input.svelte';
	import PasswordInput from '../../ui/PasswordInput.svelte';
	import { createForm } from '../../ui/form.svelte.js';
	import AuthCard, { type Provider } from './AuthCard.svelte';
	import { toErrors } from './errors';

	interface Props {
		/** Check the details. Throw an Error with a code (e.g. "invalid_credentials") to say why not. */
		onsubmit: (credentials: {
			email: string;
			password: string;
			remember: boolean;
		}) => Promise<unknown> | unknown;
		providers?: Provider[];
		onprovider?: (id: string) => void;
		forgotHref?: string;
		signUpHref?: string;
		title?: string;
		description?: string;
	}

	let {
		onsubmit,
		providers,
		onprovider,
		forgotHref,
		signUpHref,
		title = 'Sign in',
		description = 'Welcome back.'
	}: Props = $props();

	let done = $state(false);
	const form = createForm({
		messages: {
			email: {
				valueMissing: 'Enter your email address.',
				typeMismatch: 'Enter an email address like name@example.com.'
			},
			password: { valueMissing: 'Enter your password.' }
		},
		async onsubmit(data) {
			done = false;
			try {
				await onsubmit({
					email: String(data.get('email')),
					password: String(data.get('password')),
					remember: data.has('remember')
				});
				done = true;
			} catch (e) {
				return toErrors(e);
			}
		}
	});
</script>

{#snippet signUp()}New here? <a href={signUpHref}>Create an account</a>{/snippet}

<AuthCard
	{title}
	{description}
	{providers}
	{onprovider}
	busy={form.submitting}
	footer={signUpHref ? signUp : undefined}
>
	<form class="fields" {@attach form.attach}>
		{#if form.errors.form}
			<Alert tone="danger" title="Couldn’t sign you in" live>{form.errors.form}</Alert>
		{/if}
		{#if done}<Alert tone="success" title="You’re signed in" live />{/if}
		<Input
			label="Email"
			name="email"
			type="email"
			autocomplete="username"
			required
			error={form.errors.email}
		/>
		<div class="password">
			<PasswordInput label="Password" name="password" required error={form.errors.password} />
			{#if forgotHref}<a class="forgot" href={forgotHref}>Forgot password?</a>{/if}
		</div>
		<Checkbox name="remember">Keep me signed in</Checkbox>
		<Button type="submit" loading={form.submitting}>Sign in</Button>
	</form>
</AuthCard>

<style>
	.fields {
		display: grid;
		gap: 1rem;
	}
	.password {
		position: relative;
	}
	/* Beside the label, where people look for it, without pushing the field down. */
	.forgot {
		position: absolute;
		inset-block-start: 0;
		inset-inline-end: 0;
		font-size: 0.875rem;
		line-height: 1.5;
	}
</style>
