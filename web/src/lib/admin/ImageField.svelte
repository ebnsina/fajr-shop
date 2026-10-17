<script lang="ts">
	import { errorText } from '#lib/copy.js';
	import Alert from '#lib/sinaui/ui/Alert.svelte';
	import Button from '#lib/sinaui/ui/Button.svelte';
	import FileDrop from '#lib/sinaui/ui/FileDrop.svelte';

	// One uploaded picture for a form: sends its id under `name`, shows it, and can clear it.
	let {
		label,
		hint,
		name,
		removeLabel,
		value = $bindable(null),
		error
	}: {
		label: string;
		hint?: string;
		name: string;
		removeLabel: string;
		value?: { id: string; url: string } | null;
		error?: string;
	} = $props();

	let uploading = $state(false);
	let failed = $state('');

	async function upload([file]: File[]) {
		failed = '';
		uploading = true;
		const body = new FormData();
		body.set('file', file);
		const res = await fetch('/admin/uploads', { method: 'POST', body });
		const json = await res.json().catch(() => ({}));
		uploading = false;
		if (res.ok) value = { id: json.id, url: json.url };
		else failed = errorText(json.code);
	}
</script>

<div class="field">
	<input type="hidden" {name} value={value?.id ?? ''} />
	{#if value}
		<img src={value.url} alt="" />
		<div>
			<Button variant="ghost" size="sm" onclick={() => (value = null)}>{removeLabel}</Button>
		</div>
	{/if}
	<FileDrop
		{label}
		{hint}
		accept="image/jpeg,image/png,image/webp"
		maxSize={10 * 1024 * 1024}
		disabled={uploading}
		onfiles={upload}
	/>
	{#if failed || error}<Alert tone="danger" title={failed || error || ''} live />{/if}
</div>

<style>
	.field {
		display: grid;
		gap: 0.5rem;
	}
	img {
		max-inline-size: 16rem;
		max-block-size: 8rem;
		border-radius: var(--ui-radius);
		object-fit: contain;
		justify-self: start;
		background: var(--ui-subtle);
	}
</style>
