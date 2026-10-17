<script lang="ts">
	import type { Attachment } from 'svelte/attachments';

	interface Props {
		/** Used for the initials and as the accessible name. */
		name: string;
		src?: string;
		size?: 'sm' | 'md' | 'lg';
		/** Next to the person's name already: hide it from screen readers so the name isn't read twice. */
		decorative?: boolean;
		class?: string;
	}

	let { name, src, size = 'md', decorative = false, class: className }: Props = $props();

	// "Ibn Sīnā" → "IS"; one word gives one letter.
	const initials = $derived(
		name
			.split(/\s+/)
			.filter(Boolean)
			.filter((_, i, all) => i === 0 || i === all.length - 1)
			.map((w) => [...w][0].toLocaleUpperCase())
			.join('')
	);

	// Back to loading whenever src changes; the handlers below override it.
	let status = $derived.by<'loading' | 'loaded' | 'failed'>(() => (void src, 'loading'));
	// An image can finish loading before hydration, when no onload handler exists yet: check on mount.
	const settle: Attachment<HTMLImageElement> = (img) => {
		if (img.complete) status = img.naturalWidth ? 'loaded' : 'failed';
	};
</script>

<span
	class={['avatar', size, className]}
	role={decorative ? undefined : 'img'}
	aria-label={decorative ? undefined : name}
	aria-hidden={decorative || undefined}
>
	<span class="initials" aria-hidden="true">{initials}</span>
	{#if src && status !== 'failed'}
		<img
			{src}
			alt=""
			class:loaded={status === 'loaded'}
			onload={() => (status = 'loaded')}
			onerror={() => (status = 'failed')}
			{@attach settle}
		/>
	{/if}
</span>

<style>
	.avatar {
		--size: 2.5rem;
		position: relative;
		display: inline-grid;
		flex: none;
		place-items: center;
		inline-size: var(--size);
		block-size: var(--size);
		overflow: hidden;
		border-radius: 50%;
		background: var(--ui-subtle);
		color: var(--ui-muted);
		font: 600 calc(var(--size) * 0.38) / 1 var(--ui-font);
		user-select: none;
	}
	.sm {
		--size: 2rem;
	}
	.lg {
		--size: 3.5rem;
	}
	/* The photo fades in over the initials once it has loaded, so nothing pops or flashes a broken image. */
	img {
		position: absolute;
		inset: 0;
		inline-size: 100%;
		block-size: 100%;
		object-fit: cover;
		opacity: 0;
		transition: opacity var(--ui-dur-overlay) var(--ui-ease-out);
	}
	img.loaded {
		opacity: 1;
	}
	@media (prefers-reduced-motion: reduce) {
		img {
			transition: none;
		}
	}
</style>
