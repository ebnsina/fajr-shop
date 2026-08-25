<script lang="ts">
	let { data }: { data: Record<string, unknown> } = $props();

	// A closing script tag inside a JSON string would end the tag early and turn the rest of the
	// payload into markup.
	const json = $derived(JSON.stringify(data).replace(/</g, '\\u003c'));
</script>

<svelte:head>
	{@html `<script type="application/ld+json">${json}</script>`}
</svelte:head>
