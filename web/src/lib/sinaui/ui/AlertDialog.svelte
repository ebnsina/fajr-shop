<script lang="ts">
	import type { Snippet } from 'svelte';
	import Button from './Button.svelte';
	import Dialog from './Dialog.svelte';
	import Spinner from './Spinner.svelte';

	interface Props {
		open?: boolean;
		/** A question that names the action ("Delete this manuscript?"). */
		title: string;
		/** What happens, and whether it can be undone. */
		description: string;
		/** The action, as a verb ("Delete"), never "OK" or "Yes". */
		confirmLabel: string;
		cancelLabel?: string;
		/** danger for what can't be undone. */
		tone?: 'danger' | 'primary';
		/** Runs on confirm. While its promise is pending the dialog waits; if it throws, it stays open with the message. */
		onconfirm: () => void | Promise<void>;
		children?: Snippet;
	}

	let {
		open = $bindable(false),
		title,
		description,
		confirmLabel,
		cancelLabel = 'Cancel',
		tone = 'danger',
		onconfirm,
		children
	}: Props = $props();

	let pending = $state(false);
	let error = $state('');

	async function confirm() {
		error = '';
		pending = true;
		try {
			await onconfirm();
			open = false;
		} catch (e) {
			error = e instanceof Error && e.message ? e.message : "That didn't work. Try again.";
		} finally {
			pending = false;
		}
	}
</script>

<!-- role alertdialog: it interrupts, so screen readers read the question and its description at once. -->
<Dialog
	bind:open
	{title}
	{description}
	role="alertdialog"
	dismissible={false}
	class="alert-dialog"
	oncancel={(e: Event) => {
		// Escape cancels, except while the action is under way.
		if (pending) e.preventDefault();
	}}
	onclose={() => (error = '')}
>
	{@render children?.()}
	{#if error}<p class="error" role="alert">{error}</p>{/if}
	{#snippet footer()}
		<!-- Focus starts on the safe choice, so a stray Enter never confirms. -->
		<Button variant="secondary" autofocus disabled={pending} onclick={() => (open = false)}
			>{cancelLabel}</Button
		>
		<Button variant={tone} disabled={pending} onclick={confirm}>
			{#if pending}<Spinner size={16} />{/if}
			{confirmLabel}
		</Button>
	{/snippet}
</Dialog>

<style>
	:global(.alert-dialog) {
		inline-size: min(26rem, 100vw - 2rem);
	}
	.error {
		margin: 0;
		color: var(--ui-danger);
		font-size: 0.875rem;
	}
</style>
