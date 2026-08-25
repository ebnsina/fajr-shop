<script lang="ts">
	let { props }: { props: any } = $props();
</script>

<section>
	{#if props.heading}<h2>{props.heading}</h2>{/if}
	<!-- Native <details>: keyboard and screen readers work without any JS. -->
	{#each props.items as item, i (i)}
		<details>
			<summary>{item.q}</summary>
			<p>{item.a}</p>
		</details>
	{/each}
</section>

<style>
	section {
		max-inline-size: 44rem;
	}
	h2 {
		font-family: var(--font-display);
		font-weight: 400;
		font-size: 1.5rem;
		margin: 0 0 1rem;
	}
	details {
		border-block-end: 1px solid var(--c-line);
	}
	summary {
		padding: 0.875rem 0;
		cursor: pointer;
		font-weight: 500;
	}
	p {
		margin: 0 0 1rem;
		color: var(--c-muted);
		line-height: 1.7;
		white-space: pre-wrap;
	}
</style>
