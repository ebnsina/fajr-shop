<script lang="ts">
	import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/svelte';
	import {
		Shirt01FreeIcons, Baby01FreeIcons, RiceBowl01FreeIcons,
		LaptopProgrammingFreeIcons, SparklesFreeIcons, Sofa01FreeIcons,
		ArrowRight01FreeIcons
	} from '@hugeicons/core-free-icons';
	import { DEMOS } from '$lib/content';

	const ICON: Record<string, IconSvgElement> = {
		fashion: Shirt01FreeIcons,
		kids: Baby01FreeIcons,
		grocery: RiceBowl01FreeIcons,
		tech: LaptopProgrammingFreeIcons,
		beauty: SparklesFreeIcons,
		home: Sofa01FreeIcons
	};

	const total = DEMOS.reduce((n, d) => n + d.products, 0);
	const count = new Intl.NumberFormat('en-GB');
</script>

<section class="mx-auto max-w-6xl px-6 py-16">
	<p class="eyebrow">Live demos</p>
	<h1 class="mt-3 max-w-3xl text-3xl font-semibold tracking-tight text-strong sm:text-4xl">
		Six real shops, one for each trade
	</h1>
	<p class="mt-5 max-w-2xl text-lg text-muted">
		Not screenshots and not a sandbox that resets when you click something.
		Each is a working storefront with a full catalogue — {count.format(total)} products
		between them — and an admin you can log into.
	</p>

	<ul class="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
		{#each DEMOS as demo (demo.key)}
			<li>
				<a href="/demo/{demo.key}" class="card group flex h-full flex-col transition hover:shadow-lg">
					<span class="grid size-11 place-items-center rounded-xl bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">
						<HugeiconsIcon icon={ICON[demo.key]} size={20} aria-hidden="true" />
					</span>

					<h2 class="mt-4 font-semibold text-strong">{demo.label}</h2>
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

	<p class="mt-10 max-w-2xl text-sm text-muted">
		Every demo resets to the same catalogue each night, so you can place test
		orders, cancel them and change prices without breaking it for anyone else.
	</p>
</section>
