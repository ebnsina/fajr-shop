<script lang="ts">
	import { page } from '$app/state';
	import { errorPage as t } from '#lib/copy.js';
	import Button from '#lib/sinaui/ui/Button.svelte';
	import EmptyState from '#lib/sinaui/ui/EmptyState.svelte';

	const missing = $derived(page.status === 404);
</script>

<svelte:head><title>{missing ? t.notFound : t.other}</title></svelte:head>

<div class="error">
	<EmptyState title={missing ? t.notFound : t.other} level={1}>
		{missing ? t.notFoundBody : t.otherBody}
		{#snippet actions()}<Button href="/" variant="secondary">{t.home}</Button>{/snippet}
	</EmptyState>
</div>

<style>
	.error {
		display: grid;
		place-items: center;
		min-block-size: 100dvb;
		padding: 1rem;
	}
</style>
