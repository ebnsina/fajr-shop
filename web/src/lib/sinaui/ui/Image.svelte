<script lang="ts">
	import { Cancel01Icon, ImageNotFound01Icon } from '@hugeicons/core-free-icons';
	import type { HTMLImgAttributes } from 'svelte/elements';
	import Icon from './Icon.svelte';
	import { ease, ms, reduced } from './motion';

	interface Props extends Omit<HTMLImgAttributes, 'src' | 'alt' | 'placeholder'> {
		src: string;
		/** What the image shows. Use "" only for pure decoration. */
		alt: string;
		/** Box shape before it loads, e.g. "4 / 3". Defaults to width / height when both are given. */
		ratio?: string;
		fit?: 'cover' | 'contain';
		/** Shown blurred while loading: a color, or a tiny image as a data URL. */
		placeholder?: string;
		/** A caption under the image. */
		caption?: string;
		/** Opens a larger view on click: true for the same image, or a bigger file's address. */
		zoom?: boolean | string;
		class?: string;
	}

	let {
		src,
		alt,
		ratio,
		fit = 'cover',
		placeholder,
		caption,
		zoom = false,
		loading = 'lazy',
		width,
		height,
		class: className,
		...rest
	}: Props = $props();

	let status = $state<'loading' | 'loaded' | 'error'>('loading');
	// Already in the cache when it mounts: shown at once, no fade.
	let instant = $state(false);
	let img = $state<HTMLImageElement>();
	let big = $state<HTMLImageElement>();
	let viewer = $state<HTMLDialogElement>();

	const shape = $derived(ratio ?? (width && height ? `${width} / ${height}` : undefined));
	const isColor = $derived(!!placeholder && !placeholder.startsWith('data:'));
	const zoomSrc = $derived(typeof zoom === 'string' ? zoom : src);

	$effect(() => {
		void src;
		status = 'loading';
		instant = false;
		if (img?.complete) {
			instant = true;
			status = img.naturalWidth ? 'loaded' : 'error';
		}
	});

	// The larger view grows out of the thumbnail (FLIP) and shrinks back into it.
	function flip(from: DOMRect, to: DOMRect) {
		const s = from.width / to.width;
		const dx = from.left + from.width / 2 - (to.left + to.width / 2);
		const dy = from.top + from.height / 2 - (to.top + to.height / 2);
		return `translate(${dx}px, ${dy}px) scale(${s})`;
	}
	async function open() {
		if (!viewer || !big || !img) return;
		viewer.showModal();
		if (!big.complete) await big.decode().catch(() => {});
		if (reduced()) return;
		const t = flip(img.getBoundingClientRect(), big.getBoundingClientRect());
		big.animate([{ transform: t }, { transform: 'none' }], { duration: 480, easing: ease.spring });
		viewer.animate([{ backgroundColor: 'transparent' }, {}], {
			duration: 240,
			easing: ease.standard
		});
	}
	function close() {
		if (!viewer || !big || !img) return;
		if (reduced() || !img.checkVisibility()) return viewer.close();
		const t = flip(img.getBoundingClientRect(), big.getBoundingClientRect());
		const a = big.animate([{}, { transform: t }], { duration: ms(260), easing: ease.standard });
		viewer.animate([{}, { backgroundColor: 'transparent' }], { duration: ms(260) });
		a.onfinish = () => viewer?.close();
	}
</script>

{#snippet content()}
	{#if placeholder && !isColor}
		<img class="blur" src={placeholder} alt="" aria-hidden="true" />
	{/if}
	{#if status === 'error'}
		<span class="fallback" role="img" aria-label={alt || undefined}>
			<Icon icon={ImageNotFound01Icon} size={24} />
			{#if alt}<span>{alt}</span>{/if}
		</span>
	{/if}
	<img
		bind:this={img}
		{src}
		{alt}
		{width}
		{height}
		{loading}
		decoding="async"
		style:object-fit={fit}
		onload={() => (status = 'loaded')}
		onerror={() => (status = 'error')}
		{...rest}
	/>
{/snippet}

<figure class={['image', className]}>
	{#if zoom}
		<button
			type="button"
			class={['frame', status, instant && 'instant', 'zoomable']}
			style:aspect-ratio={shape}
			style:background-color={isColor ? placeholder : undefined}
			aria-label="Enlarge: {alt || 'image'}"
			onclick={open}>{@render content()}</button
		>
	{:else}
		<div
			class={['frame', status, instant && 'instant']}
			style:aspect-ratio={shape}
			style:background-color={isColor ? placeholder : undefined}
		>
			{@render content()}
		</div>
	{/if}
	{#if caption}<figcaption>{caption}</figcaption>{/if}
</figure>

{#if zoom}
	<!-- Native modal: focus is trapped and Escape closes it; a press anywhere closes it too. -->
	<dialog
		bind:this={viewer}
		class="viewer"
		aria-label={alt || 'Image'}
		oncancel={(e) => {
			e.preventDefault();
			close();
		}}
		onclick={close}
	>
		<img bind:this={big} src={zoomSrc} {alt} decoding="async" />
		<button type="button" class="close" aria-label="Close" onclick={close}>
			<Icon icon={Cancel01Icon} size={18} />
		</button>
	</dialog>
{/if}

<style>
	.image {
		margin: 0;
		min-inline-size: 0;
	}
	.frame {
		position: relative;
		display: block;
		inline-size: 100%;
		margin: 0;
		padding: 0;
		overflow: hidden;
		border: 0;
		border-radius: var(--ui-radius);
		background: var(--ui-subtle);
		color: inherit;
		font: inherit;
	}
	.frame img {
		display: block;
		inline-size: 100%;
		block-size: 100%;
	}
	.frame > img:last-child {
		position: relative;
	}
	/* Arrives out of a soft blur: opacity, filter and a hair of scale, never a jump. */
	.frame > img:not(.blur) {
		opacity: 0;
		filter: blur(12px);
		scale: 1.03;
		transition:
			opacity 400ms var(--ui-ease-enter),
			filter 500ms var(--ui-ease-enter),
			scale 600ms var(--ui-ease-enter);
	}
	.loaded > img:not(.blur) {
		opacity: 1;
		filter: none;
		scale: 1;
	}
	.instant > img:not(.blur) {
		transition: none;
	}
	.error > img:not(.blur) {
		display: none;
	}
	.blur {
		position: absolute;
		inset: 0;
		object-fit: cover;
		filter: blur(16px);
		scale: 1.1;
	}
	.loading {
		animation: breathe 1.6s ease-in-out infinite alternate;
	}
	@keyframes breathe {
		to {
			opacity: 0.7;
		}
	}
	.fallback {
		display: grid;
		place-content: center;
		justify-items: center;
		gap: 0.5rem;
		min-block-size: 8rem;
		block-size: 100%;
		padding: 1rem;
		color: var(--ui-muted);
		font-size: 0.875rem;
		text-align: center;
	}
	.zoomable {
		cursor: zoom-in;
	}
	.zoomable:focus-visible {
		outline: var(--ui-ring-width) solid var(--ui-ring);
		outline-offset: var(--ui-ring-offset);
	}
	@media (hover: hover) and (prefers-reduced-motion: no-preference) {
		.zoomable.loaded > img:not(.blur) {
			transition:
				opacity 400ms var(--ui-ease-enter),
				filter 500ms var(--ui-ease-enter),
				scale var(--ui-dur-spring) var(--ui-ease-out);
		}
		.zoomable.loaded:hover > img:not(.blur) {
			scale: 1.02;
		}
	}
	figcaption {
		margin-block-start: 0.5rem;
		color: var(--ui-muted);
		font-size: 0.875rem;
	}

	.viewer {
		box-sizing: border-box;
		inline-size: 100vw;
		max-inline-size: none;
		block-size: 100dvh;
		max-block-size: none;
		margin: 0;
		padding: 1.5rem;
		border: 0;
		background: rgb(0 0 0 / 0.85);
		cursor: zoom-out;
	}
	.viewer[open] {
		display: grid;
		place-items: center;
	}
	.viewer::backdrop {
		background: transparent;
	}
	.viewer img {
		max-inline-size: calc(100vw - 3rem);
		max-block-size: calc(100dvh - 3rem);
		border-radius: var(--ui-radius);
		object-fit: contain;
		transform-origin: center;
	}
	.close {
		position: fixed;
		inset-block-start: 1rem;
		inset-inline-end: 1rem;
		display: grid;
		place-items: center;
		inline-size: 2.5rem;
		block-size: 2.5rem;
		border: 0;
		border-radius: var(--ui-radius-control);
		background: rgb(255 255 255 / 0.12);
		color: #fff;
		cursor: pointer;
		transition:
			background-color var(--ui-dur-press) ease,
			scale var(--ui-dur-press) var(--ui-ease-out);
	}
	.close:hover {
		background: rgb(255 255 255 / 0.2);
	}
	.close:active {
		scale: 0.94;
	}
	.close:focus-visible {
		outline: var(--ui-ring-width) solid #fff;
		outline-offset: var(--ui-ring-offset);
	}
	@media (prefers-reduced-motion: reduce) {
		.frame > img:not(.blur) {
			filter: none;
			scale: 1;
			transition: opacity 200ms ease;
		}
		.loading {
			animation: none;
		}
	}
</style>
