<script lang="ts">
	let { props }: { props: any } = $props();
</script>

{#if props.youtubeId}
	<section>
		{#if props.heading}<h2>{props.heading}</h2>{/if}
		<div class="frame">
			<!-- youtube-nocookie and lazy loading: an autoplaying tracker on a
			     3G connection is the fastest way to lose the visitor. -->
			<iframe
				src="https://www.youtube-nocookie.com/embed/{props.youtubeId}"
				title={props.heading || 'Video'}
				loading="lazy"
				allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
				referrerpolicy="strict-origin-when-cross-origin"
				allowfullscreen
			></iframe>
		</div>
		{#if props.caption}<p>{props.caption}</p>{/if}
	</section>
{/if}

<style>
	h2 {
		font-family: var(--font-display);
		font-weight: 400;
		font-size: 1.5rem;
		margin: 0 0 1rem;
	}
	.frame {
		position: relative;
		aspect-ratio: 16 / 9;
		border-radius: var(--radius);
		overflow: hidden;
		background: var(--c-line);
	}
	iframe {
		position: absolute;
		inset: 0;
		inline-size: 100%;
		block-size: 100%;
		border: 0;
	}
	p {
		margin: 0.75rem 0 0;
		color: var(--c-muted);
		font-size: 0.875rem;
	}
</style>
