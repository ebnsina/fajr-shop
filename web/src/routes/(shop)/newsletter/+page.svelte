<script lang="ts">
	import { home as t } from '#lib/copy.js';
	import Button from '#lib/sinaui/ui/Button.svelte';
	import EmptyState from '#lib/sinaui/ui/EmptyState.svelte';
	import type { PageProps } from './$types';

	// Only seen without JavaScript: the form posts here and this says how it went.
	let { form }: PageProps = $props();
</script>

<svelte:head><meta name="robots" content="noindex" /></svelte:head>

<div class="site-container page">
	<EmptyState title={form?.subscribed ? t.newsletterThanks : (form?.message ?? t.newsletterTitle)}>
		{#snippet actions()}<Button href="/">{t.backHome}</Button>{/snippet}
	</EmptyState>
</div>

<style>
	.page {
		padding-block: 4rem;
	}
</style>
