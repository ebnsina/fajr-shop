<script lang="ts">
	import type { Snippet } from 'svelte';
	import { tick } from 'svelte';
	import { enhance } from '$app/forms';
	import { admin as a } from '#lib/copy.js';
	import Alert from '#lib/sinaui/ui/Alert.svelte';
	import Button from '#lib/sinaui/ui/Button.svelte';
	import Dialog from '#lib/sinaui/ui/Dialog.svelte';
	import Stepper from '#lib/sinaui/ui/Stepper.svelte';

	// A form in a dialog, one step at a time: sinaui's Dialog and Stepper, with Back / Next / Save on
	// the right. Every step stays in the form (hidden), so one submit sends all of it.
	let {
		open = $bindable(false),
		title,
		action,
		steps,
		submitLabel,
		message,
		onsaved
	}: {
		open?: boolean;
		title: string;
		action: string;
		steps: { label: string; body: Snippet }[];
		submitLabel: string;
		/** The server's message after a failed save. */
		message?: string;
		onsaved?: () => void;
	} = $props();

	const id = $props.id();
	let step = $state(0);
	let saving = $state(false);
	let panes: HTMLElement[] = $state([]);
	const last = $derived(step === steps.length - 1);

	// Starts on the first step each time it opens.
	$effect(() => {
		if (open) step = 0;
	});

	/** True when this step's fields are filled in properly; otherwise points at the first problem. */
	function valid(i: number) {
		const fields = panes[i]?.querySelectorAll<HTMLInputElement>('input, select, textarea') ?? [];
		for (const f of fields) {
			if (!f.checkValidity()) {
				f.reportValidity();
				return false;
			}
		}
		return true;
	}

	async function next() {
		if (!valid(step)) return;
		step++;
		await tick();
		panes[step]?.querySelector<HTMLElement>('input, select, textarea, button')?.focus();
	}
</script>

<Dialog bind:open {title} class="step-form">
	{#if steps.length > 1}
		<div class="stepper">
			<Stepper
				steps={steps.map((s) => ({ label: s.label }))}
				current={step}
				onstep={(i) => (step = i)}
				label={title}
			/>
		</div>
	{/if}
	<form
		{id}
		method="POST"
		{action}
		use:enhance={() => {
			saving = true;
			return async ({ result, update }) => {
				await update({ reset: false });
				saving = false;
				if (result.type === 'success') {
					open = false;
					onsaved?.();
					return;
				}
				// A field the server refused: go back to the step that holds it.
				const fields =
					(result.type === 'failure' && (result.data?.fields as Record<string, string>)) || {};
				const at = panes.findIndex((p) =>
					Object.keys(fields).some((name) => p?.querySelector(`[name="${name}"]`))
				);
				if (at >= 0) step = at;
			};
		}}
	>
		{#if message}<Alert tone="danger" title={message} live />{/if}
		{#each steps as s, i (s.label)}
			<div class="pane" hidden={i !== step} bind:this={panes[i]}>{@render s.body()}</div>
		{/each}
	</form>

	{#snippet footer()}
		<div class="buttons">
			{#if step > 0}<Button variant="ghost" onclick={() => step--}>{a.back}</Button>{/if}
			{#if last}
				<Button type="submit" form={id} loading={saving}>{submitLabel}</Button>
			{:else}
				<Button onclick={next}>{a.next}</Button>
			{/if}
		</div>
	{/snippet}
</Dialog>

<style>
	:global(.dialog.step-form) {
		inline-size: min(40rem, 100vw - 2rem);
	}
	.stepper {
		margin-block-end: 1.25rem;
	}
	form {
		display: grid;
		gap: 1rem;
	}
	.pane {
		display: grid;
		gap: 1rem;
	}
	.pane[hidden] {
		display: none;
	}
	.buttons {
		display: flex;
		justify-content: end;
		gap: 0.5rem;
		inline-size: 100%;
	}
</style>
