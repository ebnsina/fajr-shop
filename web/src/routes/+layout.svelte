<script lang="ts">
	import '../lib/sinaui/ui/tokens.css';
	import '../app.css';
	import favicon from '#lib/assets/favicon.svg';
	import { accentCss } from '#lib/brand.js';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();
	const accent = $derived(accentCss(data.store.accent_color));
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<!-- The color is checked as #rrggbb by the API and again by accentCss. -->
	{#if accent}{@html `<style>${accent}</style>`}{/if}
</svelte:head>

{@render children()}
