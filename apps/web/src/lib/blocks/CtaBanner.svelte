<script lang="ts">
	let { props }: { props: any } = $props();
</script>

<section class:quiet={props.tone === 'quiet'}>
	<div>
		{#if props.heading}<h2>{props.heading}</h2>{/if}
		{#if props.body}<p>{props.body}</p>{/if}
	</div>
	{#if props.cta?.href && props.cta?.label}
		<a href={props.cta.href}>{props.cta.label}</a>
	{/if}
</section>

<style>
	section {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 1.5rem;
		padding: 2rem;
		border-radius: var(--radius);
		background: var(--c-accent);
		color: var(--c-accent-text);
	}
	section.quiet {
		background: var(--c-surface);
		color: var(--c-text);
	}
	h2 {
		font-family: var(--font-display);
		font-weight: 400;
		font-size: 1.5rem;
		margin: 0 0 0.25rem;
	}
	p {
		margin: 0;
		opacity: 0.9;
	}
	a {
		padding: 0.75rem 1.5rem;
		border-radius: var(--radius);
		background: var(--c-accent-text);
		color: var(--c-accent);
		text-decoration: none;
		white-space: nowrap;
	}
	section.quiet a {
		background: var(--c-accent);
		color: var(--c-accent-text);
	}
</style>
