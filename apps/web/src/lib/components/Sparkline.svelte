<script lang="ts">
	// Thirty numbers in the space of a word. Not a chart library: a chart library
	// is 40KB on a connection that struggles with the product photos.
	let {
		points,
		label,
		height = 40
	}: { points: number[]; label: string; height?: number } = $props();

	const width = 120;
	const max = $derived(Math.max(...points, 1));

	const path = $derived.by(() => {
		if (points.length < 2) return '';
		const step = width / (points.length - 1);
		return points
			.map((p, i) => `${i === 0 ? 'M' : 'L'}${(i * step).toFixed(1)},${(height - (p / max) * height).toFixed(1)}`)
			.join(' ');
	});

	const area = $derived(path ? `${path} L${width},${height} L0,${height} Z` : '');
</script>

{#if path}
	<svg viewBox="0 0 {width} {height}" {height} role="img" aria-label={label} preserveAspectRatio="none">
		<path d={area} class="area" />
		<path d={path} class="line" />
	</svg>
{/if}

<style>
	svg {
		inline-size: 100%;
		display: block;
		overflow: visible;
	}
	.area {
		fill: currentColor;
		opacity: 0.1;
	}
	.line {
		fill: none;
		stroke: currentColor;
		stroke-width: 1.5;
		stroke-linejoin: round;
		stroke-linecap: round;
		vector-effect: non-scaling-stroke;
	}
</style>
