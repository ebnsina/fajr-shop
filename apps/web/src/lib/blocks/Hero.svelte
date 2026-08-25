<script lang="ts">
	let { props, media }: { props: any; media: Record<string, string> } = $props();
	const src = $derived(props.mediaId ? media[props.mediaId] : null);
</script>

<section class="hero" class:start={props.align === 'start'}>
	{#if src}
		<img {src} alt="" />
		<span class="scrim" style="--o: {props.overlay / 100}"></span>
	{/if}
	<div class="inner">
		<h2>{props.heading}</h2>
		{#if props.subheading}<p>{props.subheading}</p>{/if}
		{#if props.cta?.href && props.cta?.label}
			<a href={props.cta.href}>{props.cta.label}</a>
		{/if}
	</div>
</section>

<style>
	.hero {
		position: relative;
		display: grid;
		place-items: center;
		min-block-size: 22rem;
		border-radius: var(--radius);
		overflow: hidden;
		text-align: center;
		background: var(--c-surface);
	}
	.hero.start {
		place-items: center start;
		text-align: start;
	}
	img {
		position: absolute;
		inset: 0;
		inline-size: 100%;
		block-size: 100%;
		object-fit: cover;
	}
	/* An overlay is the only reliable way to keep text legible over any photo. */
	.scrim {
		position: absolute;
		inset: 0;
		background: rgb(0 0 0 / var(--o));
	}
	.inner {
		position: relative;
		padding: 3rem 2rem;
		max-inline-size: 40rem;
		color: var(--c-text);
	}
	.hero:has(img) .inner {
		color: #fff;
	}
	h2 {
		font-family: var(--font-display);
		font-weight: 400;
		font-size: clamp(1.75rem, 4vw, 2.75rem);
		margin: 0 0 0.5rem;
	}
	p {
		margin: 0 0 1.5rem;
		opacity: 0.85;
	}
	a {
		display: inline-block;
		padding: 0.75rem 1.75rem;
		background: var(--c-accent);
		color: var(--c-accent-text);
		border-radius: var(--radius);
		text-decoration: none;
	}
</style>
