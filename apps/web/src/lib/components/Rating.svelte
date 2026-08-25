<script lang="ts">
	import Stars from './Stars.svelte';

	let {
		summary
	}: { summary: { count: number; average: number; breakdown: number[] } } = $props();

	const pct = (n: number) => (summary.count ? Math.round((n / summary.count) * 100) : 0);
</script>

<div class="rating">
	<div class="score">
		<p class="avg">{summary.average.toFixed(1)}</p>
		<Stars rating={summary.average} size={18} />
		<p class="count">{summary.count} {summary.count === 1 ? 'review' : 'reviews'}</p>
	</div>

	<!-- A table, because it is one: star value against how many said it. -->
	<table class="bars">
		<caption class="sr-only">Ratings breakdown</caption>
		<tbody>
			{#each [5, 4, 3, 2, 1] as star (star)}
				{@const n = summary.breakdown[star - 1] ?? 0}
				<tr>
					<th scope="row">{star} star</th>
					<td class="bar">
						<span class="track"><span class="fill" style="inline-size: {pct(n)}%"></span></span>
					</td>
					<td class="n">{n}</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>

<style>
	.rating {
		display: grid;
		gap: 1.5rem;
		align-items: center;
	}
	@media (min-width: 34rem) {
		.rating {
			grid-template-columns: auto 1fr;
			gap: 2.5rem;
		}
	}
	.avg {
		font-size: 2.5rem;
		font-weight: 600;
		margin: 0;
		line-height: 1;
	}
	.count {
		color: var(--c-muted);
		font-size: 0.875rem;
		margin-block-start: 0.375rem;
	}
	.bars {
		inline-size: 100%;
		max-inline-size: 22rem;
		border-collapse: collapse;
	}
	/* The bar has no intrinsic width, so without this the column collapses to
	   zero and the track never appears. */
	.bars .bar {
		inline-size: 100%;
	}
	.bars th {
		font-weight: 400;
		font-size: 0.8125rem;
		color: var(--c-muted);
		text-align: start;
		padding-inline-end: 0.75rem;
		white-space: nowrap;
	}
	.bars td {
		padding-block: 0.1875rem;
	}
	.track {
		display: block;
		block-size: 0.5rem;
		border-radius: 999px;
		background: var(--c-line);
		overflow: hidden;
	}
	.fill {
		display: block;
		block-size: 100%;
		background: #e0a516;
	}
	.n {
		inline-size: 2.5rem;
		padding-inline-start: 0.625rem;
		text-align: end;
		font-size: 0.8125rem;
		color: var(--c-muted);
	}
	.sr-only {
		position: absolute;
		inline-size: 1px;
		block-size: 1px;
		overflow: hidden;
		clip-path: inset(50%);
	}
</style>
