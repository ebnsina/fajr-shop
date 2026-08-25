<script lang="ts">
	let { props }: { props: any } = $props();
</script>

<ul>
	{#each props.items as item (item.title)}
		<li>
			<strong>{item.title}</strong>
			{#if item.body}<span>{item.body}</span>{/if}
		</li>
	{/each}
</ul>

<style>
	ul {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
		gap: 1rem;
		list-style: none;
		margin: 0;
		padding: 1.25rem;
		background: var(--c-surface);
		border-radius: var(--radius);
		text-align: center;
	}
	strong {
		display: block;
		font-weight: 500;
		font-size: 0.9375rem;
	}
	span {
		font-size: 0.8125rem;
		color: var(--c-muted);
	}
</style>
