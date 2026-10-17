<script lang="ts">
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head>
	<title>{data.store.name}</title>
	<meta name="description" content={data.store.name} />
	<meta property="og:title" content={data.store.name} />
	<meta property="og:type" content="website" />
</svelte:head>

<!-- The storefront arrives with the catalog; until then the shop shows its name. -->
<div class="home">
	<h1>{data.store.name}</h1>
</div>

<style>
	.home {
		display: grid;
		place-items: center;
		min-block-size: 100dvb;
		padding: 1rem;
	}
	h1 {
		margin: 0;
		font-size: clamp(1.75rem, 6vw, 3rem);
		text-align: center;
	}
</style>
