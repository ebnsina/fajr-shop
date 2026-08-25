<script lang="ts">
	let { props }: { props: any } = $props();
</script>

<section>
	{#if props.heading}<h2>{props.heading}</h2>{/if}
	<!-- Plain text with preserved breaks. Never user HTML: that is an XSS hole
	     and a support burden, and a sanitiser is a dependency to keep patched. -->
	<p>{props.body}</p>
</section>

<style>
	section {
		max-inline-size: 44rem;
	}
	h2 {
		font-family: var(--font-display);
		font-weight: 400;
		font-size: 1.5rem;
		margin: 0 0 0.75rem;
	}
	p {
		margin: 0;
		white-space: pre-wrap;
		line-height: 1.7;
	}
</style>
