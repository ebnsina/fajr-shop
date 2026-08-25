<script lang="ts">
	let { props }: { props: any } = $props();

	let remaining = $state(0);

	$effect(() => {
		if (!props.endsAt) return;
		const target = new Date(props.endsAt).getTime();
		const tick = () => (remaining = Math.max(0, target - Date.now()));
		tick();
		const id = setInterval(tick, 1000);
		return () => clearInterval(id);
	});

	const parts = $derived({
		d: Math.floor(remaining / 86_400_000),
		h: Math.floor((remaining % 86_400_000) / 3_600_000),
		m: Math.floor((remaining % 3_600_000) / 60_000),
		s: Math.floor((remaining % 60_000) / 1000)
	});

	const pad = (n: number) => String(n).padStart(2, '0');
</script>

{#if props.endsAt && remaining > 0}
	<section>
		<h2>{props.heading}</h2>
		<div class="clock">
			{#each [['Days', parts.d], ['Hours', parts.h], ['Min', parts.m], ['Sec', parts.s]] as [label, value] (label)}
				<div><strong>{pad(value as number)}</strong><span>{label}</span></div>
			{/each}
		</div>
		{#if props.subheading}<p>{props.subheading}</p>{/if}
	</section>
{/if}

<style>
	section {
		text-align: center;
		padding: 2rem 1rem;
		background: var(--c-surface);
		border-radius: var(--radius);
	}
	h2 {
		font-family: var(--font-display);
		font-weight: 400;
		font-size: 1.25rem;
		margin: 0 0 1rem;
	}
	.clock {
		display: flex;
		justify-content: center;
		gap: 1.5rem;
	}
	.clock div {
		min-inline-size: 3.5rem;
	}
	strong {
		display: block;
		font-size: 2rem;
		font-variant-numeric: tabular-nums;
	}
	span {
		font-size: 0.75rem;
		color: var(--c-muted);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}
	p {
		margin: 1rem 0 0;
		color: var(--c-muted);
	}
</style>
