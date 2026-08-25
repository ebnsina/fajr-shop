<script lang="ts">
	import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/svelte';
	import {
		Shirt01FreeIcons, Baby01FreeIcons, RiceBowl01FreeIcons,
		LaptopProgrammingFreeIcons, SparklesFreeIcons, Sofa01FreeIcons,
		ArrowRight01FreeIcons
	} from '@hugeicons/core-free-icons';
	import { DEMOS } from '$lib/content';
	import { REGIONS } from '$lib/regions';

	const ICON: Record<string, IconSvgElement> = {
		fashion: Shirt01FreeIcons,
		kids: Baby01FreeIcons,
		grocery: RiceBowl01FreeIcons,
		tech: LaptopProgrammingFreeIcons,
		beauty: SparklesFreeIcons,
		home: Sofa01FreeIcons,
		'gulf-fashion': Shirt01FreeIcons,
		'gulf-tech': LaptopProgrammingFreeIcons,
		'gulf-grocery': RiceBowl01FreeIcons
	};

	// Grouped by region: a Dubai merchant should not have to read past six
	// Bangladeshi shops to find one priced in dirhams.
	const grouped = REGIONS.map((region) => ({
		region,
		demos: DEMOS.filter((d) => d.region === region.id)
	}));

	const total = DEMOS.reduce((n, d) => n + d.products, 0);
	const count = new Intl.NumberFormat('en-GB');
</script>

<section class="mx-auto max-w-6xl px-6 py-16">
	<p class="eyebrow">Live demos</p>
	<h1 class="display mt-3 max-w-3xl text-3xl font-semibold tracking-tight text-strong sm:text-4xl">
		Nine real shops, across two regions
	</h1>
	<p class="mt-5 max-w-2xl text-lg text-muted">
		Not screenshots, and not a sandbox that resets when you click something.
		Each is a working storefront with a full catalogue — {count.format(total)} products
		between them — and an admin you can log into. South Asia and the Gulf are
		different shops, not the same shop with the prices swapped.
	</p>

	{#each grouped as group (group.region.id)}
		<section class="mt-12">
			<div class="flex flex-wrap items-baseline gap-3">
				<h2 class="display text-xl font-semibold tracking-tight text-strong">{group.region.label}</h2>
				<p class="text-sm text-muted">{group.region.markets.join(' · ')}</p>
				{#if group.region.status === 'building'}
					<span class="badge-soon">In build</span>
				{/if}
			</div>
			<p class="mt-2 max-w-2xl text-sm text-muted">{group.region.proof}</p>

			<ul class="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
				{#each group.demos as demo (demo.key)}
			<li>
				<a href="/demo/{demo.key}" class="card group flex h-full flex-col transition hover:shadow-lg">
					<span class="grid size-11 place-items-center rounded-xl bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">
						<HugeiconsIcon icon={ICON[demo.key]} size={20} aria-hidden="true" />
					</span>

					<h2 class="display mt-4 font-semibold text-strong">{demo.label}</h2>
					<p class="mt-1 text-sm text-muted">{demo.tagline}</p>

					<ul class="mt-4 space-y-1.5 text-sm text-muted">
						{#each demo.shows as item (item)}
							<li class="flex gap-2">
								<span aria-hidden="true" class="text-primary-600">·</span>{item}
							</li>
						{/each}
					</ul>

					<p class="mt-auto pt-5 text-xs text-faint">
						{demo.shop} · {count.format(demo.products)} products · {demo.theme}
					</p>
					<span class="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary-700 dark:text-primary-300">
						Open this demo
						<HugeiconsIcon
							icon={ArrowRight01FreeIcons}
							size={16}
							aria-hidden="true"
							class="transition group-hover:translate-x-0.5"
						/>
					</span>
				</a>
			</li>
				{/each}
			</ul>
		</section>
	{/each}

	<p class="mt-12 max-w-2xl text-sm text-muted">
		These are shared demo shops, so place test orders, cancel them and change
		prices freely — nothing here is anyone's live storefront.
	</p>
</section>
