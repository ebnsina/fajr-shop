<script lang="ts">
	import { MARKETS, REGIONS, type Market } from '$lib/regions';
	import { LAND_DOTS } from '$lib/land';

	let { selected = $bindable() }: { selected: Market } = $props();

	const R = 96;
	const C = 100;
	// Tilted so the markets we sell into sit above the equator, which is where
	// an untilted globe would put them.
	const TILT = (16 * Math.PI) / 180;

	let spin = $state(-88);
	let dragging = $state(false);
	let hovering = $state(false);

	const rad = (d: number) => (d * Math.PI) / 180;

	// Orthographic projection — the honest one for a globe, because it is what a
	// sphere actually looks like from far away. z says which side we are on.
	function project(lat: number, lon: number) {
		const p = rad(lat);
		const l = rad(lon + spin);
		const cp = Math.cos(p);
		const x = cp * Math.sin(l);
		const y = Math.cos(TILT) * Math.sin(p) - Math.sin(TILT) * cp * Math.cos(l);
		const z = Math.sin(TILT) * Math.sin(p) + Math.cos(TILT) * cp * Math.cos(l);
		return { x: C + x * R, y: C - y * R, z };
	}

	/*
	 * Land is a dot matrix, not filled coastline. Orthographic puts both
	 * hemispheres on the same disc, so filled polygons need the far side clipped
	 * and every visible run closed along the limb — dots need none of that: a
	 * point is either in front of the horizon or it is not drawn.
	 */
	const dots = $derived.by(() => {
		const out: { x: number; y: number; r: number; o: number }[] = [];
		for (let i = 0; i < LAND_DOTS.length; i += 2) {
			const { x, y, z } = project(LAND_DOTS[i]!, LAND_DOTS[i + 1]!);
			if (z <= 0.02) continue;
			// Shrinking and fading towards the limb is what makes it read as round.
			out.push({ x, y, r: 0.5 + z * 0.7, o: 0.1 + z * 0.62 });
		}
		return out;
	});

	// The graticule sits under the land: it says "globe" before a single
	// continent is recognisable, and it shows the turn between landmasses.
	const MERIDIANS = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];
	const PARALLELS = [-60, -30, 0, 30, 60];
	const arcPath = (pts: { x: number; y: number; z: number }[]) => {
		let d = '';
		let pen = false;
		for (const p of pts) {
			if (p.z <= 0) {
				pen = false;
				continue;
			}
			d += `${pen ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
			pen = true;
		}
		return d;
	};
	const grid = $derived([
		...MERIDIANS.map((lon) => arcPath(Array.from({ length: 61 }, (_, i) => project(-90 + i * 3, lon)))),
		...PARALLELS.map((lat) => arcPath(Array.from({ length: 121 }, (_, i) => project(lat, -180 + i * 3))))
	]);

	const pins = $derived(MARKETS.map((m) => ({ m, ...project(m.lat, m.lon) })));

	// Eight country labels on one sphere is a pile, not a map: the region carries
	// the name, sitting at the middle of its markets, and the chosen country is
	// the only one that says its own.
	const hubs = $derived(
		REGIONS.map((r) => {
			const own = MARKETS.filter((m) => m.region === r.id);
			const lat = own.reduce((t, m) => t + m.lat, 0) / own.length;
			const lon = own.reduce((t, m) => t + m.lon, 0) / own.length;
			return { id: r.id, text: r.label, ...project(lat, lon) };
		})
	);

	// The hops between regions, drawn as a chain: one shop, however many markets
	// there turn out to be. Lifted off the surface so each reads as a route
	// rather than a line ruled across the sphere.
	const routes = $derived.by(() => {
		const out: string[] = [];
		for (let i = 0; i < hubs.length - 1; i++) {
			const a = hubs[i]!;
			const b = hubs[i + 1]!;
			if (a.z <= 0.05 || b.z <= 0.05) continue;
			const mx = (a.x + b.x) / 2 - C;
			const my = (a.y + b.y) / 2 - C;
			const lift = 1 + Math.hypot(a.x - b.x, a.y - b.y) / (R * 2.4);
			out.push(
				`M${a.x.toFixed(1)} ${a.y.toFixed(1)}Q${(C + mx * lift).toFixed(1)} ${(C + my * lift).toFixed(1)} ${b.x.toFixed(1)} ${b.y.toFixed(1)}`
			);
		}
		return out;
	});

	function select(m: Market) {
		selected = m;
		spin = -m.lon + 4;
	}

	function drag(e: PointerEvent) {
		if (!dragging) return;
		spin += e.movementX * 0.3;
	}

	// It turns on its own until someone touches it — a still globe reads as a
	// picture of one. Stops entirely for anyone who asked for less motion.
	$effect(() => {
		if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
		let frame = 0;
		const tick = () => {
			if (!dragging && !hovering) spin += 0.04;
			frame = requestAnimationFrame(tick);
		};
		frame = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(frame);
	});
</script>

<div class="globe-wrap">
	<!--
	  A pointer can spin the globe and grab a marker; everyone else uses the
	  buttons underneath. Both drive one selection.
	-->
	<div
		class="globe {dragging ? 'cursor-grabbing' : 'cursor-grab'}"
		role="presentation"
		onpointerdown={(e) => {
			dragging = true;
			(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
		}}
		onpointerup={() => (dragging = false)}
		onpointerenter={() => (hovering = true)}
		onpointerleave={() => {
			dragging = false;
			hovering = false;
		}}
		onpointermove={drag}
	>
		<svg viewBox="0 0 200 200" class="block size-full touch-none select-none" aria-hidden="true">
			<circle cx={C} cy={C} r={R} class="globe-face" />
			<g class="globe-grid">
				{#each grid as d, i (i)}
					{#if d}<path {d} />{/if}
				{/each}
			</g>
			<g class="globe-land">
				{#each dots as d, i (i)}
					<circle cx={d.x.toFixed(2)} cy={d.y.toFixed(2)} r={d.r.toFixed(2)} opacity={d.o.toFixed(2)} />
				{/each}
			</g>
			{#each routes as d, i (i)}
				<path {d} class="globe-route" />
			{/each}
			<circle cx={C} cy={C} r={R} class="globe-edge" />
		</svg>

		<!-- Markers are HTML, not SVG: the chips stay crisp at any globe size. -->
		{#each pins as pin (pin.m.name)}
			{#if pin.z > 0.06}
				<button
					class="dot"
					data-on={pin.m.name === selected.name}
					style="left: {(pin.x / 2).toFixed(2)}%; top: {(pin.y / 2).toFixed(2)}%; opacity: {(0.35 + pin.z).toFixed(2)}"
					onclick={() => select(pin.m)}
					aria-label={pin.m.name}
					tabindex="-1"
				></button>
			{/if}
		{/each}

		{#each hubs as h (h.text)}
			{#if h.z > 0.12}
				<span
					class="pin"
					data-on={h.id === selected.region}
					style="left: {(h.x / 2).toFixed(2)}%; top: {(h.y / 2).toFixed(2)}%; opacity: {(0.3 + h.z).toFixed(2)}"
				>
					{h.text}
				</span>
			{/if}
		{/each}
	</div>

	<ul class="mt-6 flex flex-wrap justify-center gap-2">
		{#each MARKETS as m (m.name)}
			<li>
				<button
					onclick={() => select(m)}
					aria-pressed={m.name === selected.name}
					class="chrome min-h-11 rounded-[var(--radius-control)] border px-3.5 transition
					       {m.name === selected.name
						? 'border-transparent bg-[var(--color-primary-600)] !text-white'
						: 'border-line hover:border-line-strong hover:!text-strong'}"
				>
					{m.name}
				</button>
			</li>
		{/each}
	</ul>
</div>
