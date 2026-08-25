<script lang="ts">
	import Grid from '$lib/components/ProductGrid.svelte';
	let { props, products, currency, locale }: {
		props: any;
		products: any[];
		currency: string;
		locale: string;
	} = $props();
</script>

<section>
	{#if props.heading}<h2>{props.heading}</h2>{/if}
	{#if products.length}
		<Grid items={products} {currency} {locale} />
	{:else}
		<p class="empty">Nothing to show here yet.</p>
	{/if}
</section>

<style>
	h2 {
		font-family: var(--font-display);
		font-weight: 400;
		font-size: 1.5rem;
		margin: 0 0 1rem;
	}
	.empty {
		color: var(--c-muted);
	}
</style>
