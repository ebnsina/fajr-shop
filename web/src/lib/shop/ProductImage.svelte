<script lang="ts">
	import ImageIcon from '@lucide/svelte/icons/image';
	import { shop as t } from '#lib/copy.js';
	import Image from '#lib/sinaui/ui/Image.svelte';

	// A product photo, or (with no URL yet) a quiet empty slot the same shape.
	let {
		src,
		alt,
		ratio = '4 / 5',
		zoom = false,
		icon = 32,
		loading = 'lazy',
		class: className
	}: {
		src?: string;
		alt: string;
		ratio?: string;
		zoom?: boolean;
		icon?: number;
		loading?: 'lazy' | 'eager';
		class?: string;
	} = $props();
</script>

{#if src}
	<Image {src} {alt} {ratio} {zoom} {loading} class={className} />
{:else}
	<div
		class={['slot', className]}
		style:aspect-ratio={ratio}
		role={alt ? 'img' : undefined}
		aria-label={alt ? `${alt} (${t.noPhoto})` : undefined}
		aria-hidden={alt ? undefined : 'true'}
	>
		<ImageIcon size={icon} strokeWidth={1.5} />
	</div>
{/if}

<style>
	.slot {
		display: grid;
		place-items: center;
		inline-size: 100%;
		border-radius: var(--ui-radius);
		background: var(--ui-subtle);
		color: color-mix(in srgb, var(--ui-muted) 55%, transparent);
	}
</style>
