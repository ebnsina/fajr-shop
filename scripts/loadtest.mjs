// A load test that answers the plan's actual question: does one box serve 1–10M pageviews a
// month, and what cracks first?
const BASE = process.env.TARGET ?? 'http://localhost:3000';
const DURATION_MS = Number(process.env.DURATION ?? 10_000);
const CONCURRENCY = Number(process.env.CONCURRENCY ?? 50);

const SCENARIOS = [
	{ name: 'home', path: '/', weight: 4 },
	{ name: 'category', path: '/c/sarees', weight: 3 },
	{ name: 'product', path: null, weight: 3 },
	{ name: 'search', path: '/search?q=saree', weight: 1 },
	{ name: 'sitemap', path: '/sitemap.xml', weight: 1 }
];

/** Real product URLs, so this is not one cached path repeated. */
const res = await fetch(`${BASE}/sitemap.xml`);
const products = [...(await res.text()).matchAll(/<loc>([^<]*\/products\/[^<]*)<\/loc>/g)].map((m) => m[1]);

if (products.length === 0) {
	console.error('No products in the sitemap — seed the demo shop first.');
	process.exit(1);
}

const pool = SCENARIOS.flatMap((s) => Array(s.weight).fill(s));
const stats = new Map(SCENARIOS.map((s) => [s.name, { n: 0, errors: 0, times: [] }]));

let stop = false;
setTimeout(() => (stop = true), DURATION_MS);

async function worker() {
	while (!stop) {
		const scenario = pool[Math.floor(Math.random() * pool.length)];
		const url = scenario.path ?? products[Math.floor(Math.random() * products.length)];
		const bucket = stats.get(scenario.name);
		const started = performance.now();

		try {
			const r = await fetch(url.startsWith('http') ? url : `${BASE}${url}`, {
				headers: { 'accept-encoding': 'gzip' }
			});
			await r.arrayBuffer();
			bucket.times.push(performance.now() - started);
			bucket.n += 1;
			if (!r.ok) bucket.errors += 1;
		} catch {
			bucket.errors += 1;
			bucket.n += 1;
		}
	}
}

const started = performance.now();
await Promise.all(Array.from({ length: CONCURRENCY }, worker));
const elapsed = (performance.now() - started) / 1000;

const pct = (times, p) => {
	if (!times.length) return 0;
	const sorted = [...times].sort((a, b) => a - b);
	return sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))];
};

let total = 0;
let errors = 0;
const all = [];

console.log(`\n  ${CONCURRENCY} concurrent · ${elapsed.toFixed(1)}s · ${BASE}\n`);
console.log('  scenario     reqs    rps     p50     p95     p99  errors');
console.log('  ' + '-'.repeat(58));

for (const [name, s] of stats) {
	total += s.n;
	errors += s.errors;
	all.push(...s.times);
	console.log(
		`  ${name.padEnd(11)} ${String(s.n).padStart(5)} ${(s.n / elapsed).toFixed(0).padStart(6)} ` +
			`${pct(s.times, 50).toFixed(0).padStart(6)}ms ${pct(s.times, 95).toFixed(0).padStart(5)}ms ` +
			`${pct(s.times, 99).toFixed(0).padStart(5)}ms ${String(s.errors).padStart(6)}`
	);
}

console.log('  ' + '-'.repeat(58));
console.log(
	`  ${'total'.padEnd(11)} ${String(total).padStart(5)} ${(total / elapsed).toFixed(0).padStart(6)} ` +
		`${pct(all, 50).toFixed(0).padStart(6)}ms ${pct(all, 95).toFixed(0).padStart(5)}ms ` +
		`${pct(all, 99).toFixed(0).padStart(5)}ms ${String(errors).padStart(6)}`
);

// The plan's target: 1–10M pageviews/month is 0.4–4 req/s average, 50–200 peak.
const rps = total / elapsed;
console.log(`\n  ${rps.toFixed(0)} req/s sustained — ${(rps / 200).toFixed(1)}x the plan's 200 req/s peak target.`);
if (errors > 0) console.log(`  ${errors} errors: investigate before trusting the number.`);
