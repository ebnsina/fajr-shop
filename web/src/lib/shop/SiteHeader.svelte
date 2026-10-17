<script lang="ts">
	import { Menu01Icon, Search01Icon } from '@hugeicons/core-free-icons';
	import { onMount } from 'svelte';
	import type { components } from '#lib/api.js';
	import { shop as t } from '#lib/copy.js';
	import Button from '#lib/sinaui/ui/Button.svelte';
	import Dialog from '#lib/sinaui/ui/Dialog.svelte';
	import { glide } from '#lib/sinaui/ui/glide.js';
	import Icon from '#lib/sinaui/ui/Icon.svelte';

	let {
		store,
		nav
	}: {
		store: components['schemas']['Store'];
		nav: { label: string; href: string }[];
	} = $props();

	let menu = $state(false);
	let scrolled = $state(false);
	let hover = $state() as HTMLSpanElement;

	onMount(() => {
		const onScroll = () => (scrolled = scrollY > 8);
		onScroll();
		addEventListener('scroll', onScroll, { passive: true });
		return () => removeEventListener('scroll', onScroll);
	});
</script>

<header class={['header', scrolled && 'scrolled']}>
	<div class="row">
		<Button
			variant="ghost"
			size="sm"
			square
			class="narrow"
			aria-label={t.menu}
			onclick={() => (menu = true)}><Icon icon={Menu01Icon} /></Button
		>
		<a class="brand" href="/">
			{#if store.logo_url}<img src={store.logo_url} alt={store.name} />{:else}{store.name}{/if}
		</a>
		<nav
			aria-label={t.all}
			onpointerover={(e) => {
				if (e.pointerType === 'touch') return;
				glide(hover, (e.target as Element).closest<HTMLElement>('a'), true);
			}}
			onpointerleave={() => glide(hover, null, false)}
		>
			<span class="hover" aria-hidden="true" bind:this={hover}></span>
			{#each nav as link (link.href)}<a href={link.href}>{link.label}</a>{/each}
		</nav>
		<div class="end">
			<Button variant="ghost" size="sm" square aria-label={t.search} href="/search">
				<Icon icon={Search01Icon} size={18} />
			</Button>
		</div>
	</div>
</header>

<Dialog bind:open={menu} side="start" title={store.name}>
	<nav class="sheet" aria-label={t.all}>
		{#each nav as link (link.href)}
			<a href={link.href} onclick={() => (menu = false)}>{link.label}</a>
		{/each}
		<a href="/search" onclick={() => (menu = false)}>{t.search}</a>
	</nav>
</Dialog>

<style>
	.header {
		position: sticky;
		inset-block-start: 0;
		z-index: 20;
		background: color-mix(in srgb, var(--ui-bg) 82%, transparent);
		backdrop-filter: blur(14px) saturate(1.4);
		transition: box-shadow var(--ui-dur) var(--ui-ease-out);
	}
	.scrolled {
		box-shadow: 0 1px 0 var(--ui-line);
	}
	.row {
		display: flex;
		align-items: center;
		gap: 1.25rem;
		box-sizing: border-box;
		inline-size: min(76rem, 100%);
		block-size: 4rem;
		margin-inline: auto;
		padding-inline: 1rem;
	}
	.brand {
		display: inline-flex;
		align-items: center;
		min-inline-size: 0;
		color: var(--ui-fg);
		font-size: 1.0625rem;
		font-weight: 650;
		text-decoration: none;
		white-space: nowrap;
	}
	.brand img {
		max-block-size: 2.25rem;
		max-inline-size: 10rem;
		object-fit: contain;
	}
	nav:not(.sheet) {
		position: relative;
		display: flex;
		gap: 0.125rem;
		min-inline-size: 0;
		overflow: hidden;
	}
	nav:not(.sheet) a {
		position: relative;
		padding: 0.375rem 0.75rem;
		border-radius: var(--ui-radius-control);
		color: var(--ui-muted);
		font-size: 0.875rem;
		font-weight: 500;
		text-decoration: none;
		white-space: nowrap;
		transition: color var(--ui-dur-press) ease;
	}
	@media (hover: hover) {
		nav:not(.sheet) a:hover {
			color: var(--ui-fg);
		}
	}
	.hover {
		position: absolute;
		top: 0;
		left: 0;
		transform-origin: 0 0;
		border-radius: var(--ui-radius-control);
		background: var(--ui-subtle);
		opacity: 0;
		pointer-events: none;
		transition: opacity var(--ui-dur-exit) ease;
	}
	.end {
		display: flex;
		align-items: center;
		gap: 0.125rem;
		margin-inline-start: auto;
	}
	.sheet {
		display: grid;
		gap: 0.25rem;
	}
	.sheet a {
		padding: 0.75rem;
		border-radius: var(--ui-radius-control);
		color: var(--ui-fg);
		font: 500 1rem var(--ui-font);
		text-decoration: none;
	}
	a:focus-visible {
		outline: var(--ui-ring-width) solid var(--ui-ring);
		outline-offset: var(--ui-ring-offset);
	}
	@media (width < 56rem) {
		nav:not(.sheet) {
			display: none;
		}
		.row {
			gap: 0.5rem;
		}
	}
	@media (width >= 56rem) {
		.row > :global(.narrow) {
			display: none;
		}
	}
</style>
