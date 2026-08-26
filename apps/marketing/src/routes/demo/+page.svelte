<script lang="ts">
	import type { Component } from 'svelte';
	import { Shirt, Baby, ShoppingBasket, Laptop, Sparkles, Sofa } from '@lucide/svelte';
	import Arrow from '$lib/Arrow.svelte';
	import { DEMOS } from '$lib/content';
	import { REGIONS } from '$lib/regions';

	// One icon per trade, so a wall of similar text can be told apart at a glance.
	const ICON: Record<string, Component> = {
		fashion: Shirt,
		kids: Baby,
		grocery: ShoppingBasket,
		tech: Laptop,
		beauty: Sparkles,
		home: Sofa,
		'gulf-fashion': Shirt,
		'gulf-tech': Laptop,
		'gulf-grocery': ShoppingBasket
	};

	// Grouped by region: a Gulf merchant should not have to read past six South
	// Asian shops to find one priced in dirhams.
	const grouped = REGIONS.map((region) => ({
		region,
		demos: DEMOS.filter((d) => d.region === region.id)
	}));

	const total = DEMOS.reduce((n, d) => n + d.products, 0);
	const count = new Intl.NumberFormat('en-GB');
</script>

<section class="sec !pb-[clamp(40px,7vh,80px)]">
	<div class="wrap">
		<p class="eyebrow mb-6">Live demos</p>
		<h1 class="display max-w-[20ch]" style="font-size: var(--text-section)">
			Nine real shops you can place an order in
		</h1>
		<p class="mt-7 max-w-[58ch] leading-relaxed text-body" style="font-size: var(--text-lead)">
			Not screenshots, and not a sandbox that resets when you click something.
			Each is a working storefront with a full catalogue —
			<span class="num">{count.format(total)}</span> products between them — and an
			admin you can log into.
		</p>
	</div>
</section>

{#each grouped as group (group.region.id)}
	<section class="sec !pt-0">
		<div class="wrap">
			<div class="flex flex-wrap items-baseline gap-3">
				<h2 class="display text-[clamp(1.375rem,2.4vw,1.75rem)]">{group.region.label}</h2>
				<p class="chrome">{group.region.markets.join(' · ')}</p>
				{#if group.region.status === 'building'}
					<span class="badge-soon">In build</span>
				{/if}
			</div>
			<p class="mt-3 max-w-[62ch] leading-relaxed text-muted">{group.region.proof}</p>

			<ul class="bento stagger mt-8">
				{#each group.demos as demo (demo.key)}
					{@const Icon = ICON[demo.key]}
					<li class="cell">
						<a href="/demo/{demo.key}" class="tile w-full">
							<span class="grid size-9 place-items-center rounded-[var(--radius-control)] bg-[var(--color-primary-50)] text-[var(--color-primary-700)]">
								<Icon size={17} aria-hidden="true" />
							</span>

							<span class="tile-title mt-1">{demo.label}</span>
							<span class="tile-body">{demo.tagline}</span>

							<ul class="mt-2 space-y-1.5">
								{#each demo.shows as item (item)}
									<li class="chrome flex gap-2">
										<span aria-hidden="true" class="!text-[var(--color-primary-500)]">·</span>
										{item}
									</li>
								{/each}
							</ul>

							<span class="chrome mt-auto pt-5">
								{demo.shop} · <span class="num">{count.format(demo.products)}</span> products
							</span>
							<span class="link mt-2">Open this demo <Arrow /></span>
						</a>
					</li>
				{/each}
			</ul>
		</div>
	</section>
{/each}

<section class="sec !pt-0">
	<div class="wrap">
		<p class="chrome max-w-[62ch] border-t border-line pt-6">
			These are shared demo shops, so place test orders, cancel them and change
			prices freely — nothing here is anyone's live storefront, and they reset
			every night.
		</p>
	</div>
</section>
