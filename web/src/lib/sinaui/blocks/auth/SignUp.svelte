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
		/** Create the account. Throw an Error with a code (e.g. "email_taken") to say why not. */
		onsubmit: (account: {
			name: string;
			email: string;
			password: string;
		}) => Promise<unknown> | unknown;
		providers?: Provider[];
		onprovider?: (id: string) => void;
		/** Where the terms are; without it there's no terms box to tick. */
		termsHref?: string;
		signInHref?: string;
		/** Shortest password accepted. */
		minLength?: number;
		title?: string;
		description?: string;
	}

	let {
		onsubmit,
		providers,
		onprovider,
		termsHref,
		signInHref,
		minLength = 10,
		title = 'Create an account',
		description = 'It takes a minute.'
	}: Props = $props();

	let done = $state(false);
	const form = createForm({
		messages: {
			name: { valueMissing: 'Enter your name.' },
			email: {
				valueMissing: 'Enter your email address.',
				typeMismatch: 'Enter an email address like name@example.com.'
			},
			password: {
				valueMissing: 'Choose a password.',
				get tooShort() {
					return `Use at least ${minLength} characters.`;
				}
			},
			terms: { valueMissing: 'Agree to the terms to create an account.' }
		},
		async onsubmit(data) {
			done = false;
			try {
				await onsubmit({
					name: String(data.get('name')).trim(),
					email: String(data.get('email')).trim(),
					password: String(data.get('password'))
				});
				done = true;
			} catch (e) {
				return toErrors(e);
			}
		}
	});
</script>

{#snippet signIn()}Already have an account? <a href={signInHref}>Sign in</a>{/snippet}

<AuthCard
	{title}
	{description}
	{providers}
	{onprovider}
	busy={form.submitting}
	footer={signInHref ? signIn : undefined}
>
	<form class="fields" {@attach form.attach}>
		{#if form.errors.form}
			<Alert tone="danger" title="Couldn’t create the account" live>{form.errors.form}</Alert>
		{/if}
		{#if done}<Alert tone="success" title="Account created" live />{/if}
		<Input label="Name" name="name" autocomplete="name" required error={form.errors.name} />
		<Input
			label="Email"
			name="email"
			type="email"
			autocomplete="email"
			required
			error={form.errors.email}
		/>
		<PasswordInput
			label="Password"
			name="password"
			isNew
			required
			minlength={minLength}
			hint="At least {minLength} characters."
			error={form.errors.password}
		/>
		{#if termsHref}
			<Checkbox name="terms" required error={form.errors.terms}>
				I agree to the <a href={termsHref}>terms</a>
			</Checkbox>
		{/if}
		<Button type="submit" loading={form.submitting}>Create account</Button>
	</form>
</AuthCard>

<style>
	.fields {
		display: grid;
		gap: 1rem;
	}
</style>
