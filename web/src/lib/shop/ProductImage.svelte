<script lang="ts">
	import { Image01Icon } from '@hugeicons/core-free-icons';
	import { shop as t } from '#lib/copy.js';
	import Icon from '#lib/sinaui/ui/Icon.svelte';
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
		<Icon icon={Image01Icon} size={icon} />
	</div>
{/if}

<style>
	.slot {
		display: grid;
		place-items: center;
		inline-size: 100%;
		border-radius: var(--ui-radius);
		background: linear-gradient(
			135deg,
			var(--ui-subtle),
			color-mix(in srgb, var(--ui-subtle) 50%, transparent)
		);
		color: color-mix(in srgb, var(--ui-muted) 55%, transparent);
	}
</style>
