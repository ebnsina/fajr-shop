<script lang="ts">
	let { props, categories }: { props: any; categories: { name: string; slug: string; url: string | null }[] } = $props();
</script>

{#if categories.length}
	<section>
		{#if props.heading}<h2>{props.heading}</h2>{/if}
		<ul>
			{#each categories as c (c.slug)}
				<li>
					<a href="/c/{c.slug}">
						{#if c.url}<img src={c.url} alt="" loading="lazy" />{:else}<span class="ph"></span>{/if}
						<strong>{c.name}</strong>
					</a>
				</li>
			{/each}
		</ul>
	</section>
{/if}

<style>
	h2 {
		font-family: var(--font-display);
		font-weight: 400;
		font-size: 1.5rem;
		margin: 0 0 1rem;
	}
	ul {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(9rem, 1fr));
		gap: var(--grid-gap);
		list-style: none;
		margin: 0;
		padding: 0;
	}
	a {
		display: block;
		text-decoration: none;
		color: inherit;
	}
	img,
	.ph {
		display: block;
		inline-size: 100%;
		aspect-ratio: 1;
		object-fit: cover;
		border-radius: var(--radius);
		background: var(--c-line);
	}
	strong {
		display: block;
		margin-block-start: 0.5rem;
		font-weight: 400;
		text-align: center;
	}
</style>
