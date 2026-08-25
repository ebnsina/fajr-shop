<script lang="ts">
	let { props, media }: { props: any; media: Record<string, string> } = $props();
</script>

<section>
	{#if props.heading}<h2>{props.heading}</h2>{/if}
	<ul>
		{#each props.items as item, i (i)}
			<li>
				<blockquote>{item.quote}</blockquote>
				<div class="who">
					{#if item.mediaId && media[item.mediaId]}
						<img src={media[item.mediaId]} alt="" />
					{/if}
					{#if item.name}<cite>{item.name}</cite>{/if}
				</div>
			</li>
		{/each}
	</ul>
</section>

<style>
	h2 {
		font-family: var(--font-display);
		font-weight: 400;
		font-size: 1.5rem;
		margin: 0 0 1rem;
	}
	ul {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
		gap: 1rem;
		list-style: none;
		margin: 0;
		padding: 0;
	}
	li {
		background: var(--c-surface);
		border-radius: var(--radius);
		padding: 1.25rem;
	}
	blockquote {
		margin: 0 0 0.875rem;
		line-height: 1.6;
	}
	.who {
		display: flex;
		align-items: center;
		gap: 0.625rem;
	}
	img {
		inline-size: 2rem;
		block-size: 2rem;
		border-radius: 50%;
		object-fit: cover;
	}
	cite {
		font-style: normal;
		font-size: 0.875rem;
		color: var(--c-muted);
	}
</style>
