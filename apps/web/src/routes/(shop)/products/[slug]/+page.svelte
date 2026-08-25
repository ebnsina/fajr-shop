<script lang="ts">
	import { enhance } from '$app/forms';
	import { moneyFor } from '$lib/money';
	import JsonLd from '$lib/components/JsonLd.svelte';
	import Stars from '$lib/components/Stars.svelte';
	import Rating from '$lib/components/Rating.svelte';
	import ProductGrid from '$lib/components/ProductGrid.svelte';
	import { page as appPage } from '$app/state';
	import type { PageData } from './$types';

	// The add-to-bag form posts to /cart?/add, so its result can't be inferred
	// from this route — declare the shape that action actually returns.
	let {
		data,
		form
	}: {
		data: PageData;
		form:
			| {
					error?: string;
					added?: boolean;
					reviewed?: boolean;
					asked?: boolean;
					reviewError?: string;
					questionError?: string;
			  }
			| null;
	} = $props();
	const p = $derived(data.product);

	let activeImage = $state(0);
	// -1 means the video slide. Videos sell clothing here more than photos do,
	// so it lives in the carousel rather than buried below.
	let showingVideo = $state(false);

	// youtu.be, /watch?v= and /embed/ all appear in a merchant's paste buffer.
	const videoId = $derived.by(() => {
		const raw = p.videoUrl;
		if (!raw) return null;
		const m = raw.match(/(?:youtu\.be\/|v=|embed\/)([\w-]{11})/);
		return m?.[1] ?? null;
	});
	/** optionId → selected optionValueId */
	let picked = $state<Record<string, string>>({});

	// Single-variant products have nothing to pick, so pre-select it.
	$effect(() => {
		if (p.options.length === 0) picked = {};
	});

	const selected = $derived(
		p.options.length === 0
			? p.variants[0]
			: p.variants.find((v) => {
					const chosen = Object.values(picked);
					return (
						chosen.length === p.options.length &&
						chosen.every((id) => v.optionValueIds.includes(id))
					);
				})
	);

	/** Grey out a value if no variant pairs it with what's already chosen. */
	function reachable(optionId: string, valueId: string): boolean {
		const others = Object.entries(picked).filter(([id]) => id !== optionId).map(([, v]) => v);
		return p.variants.some(
			(v) =>
				v.optionValueIds.includes(valueId) &&
				others.every((o) => v.optionValueIds.includes(o)) &&
				(v.available > 0 || v.allowBackorder)
		);
	}

	const priceMinor = $derived(selected?.priceMinor ?? Math.min(...p.variants.map((v) => v.priceMinor)));
	const compareMinor = $derived(selected?.compareAtMinor ?? null);
	const buyable = $derived(Boolean(selected && (selected.available > 0 || selected.allowBackorder)));
	const needsChoice = $derived(p.options.length > 0 && !selected);

	const money = $derived(moneyFor({ currency: data.store.currency, locale: data.store.numberLocale }));

	// Product structured data with an AggregateOffer, so a listing with six variants shows one
	// price range rather than six competing results.
	const anyAvailable = $derived(p.variants.some((v) => v.available > 0 || v.allowBackorder));
	const prices = $derived(p.variants.map((v) => v.priceMinor));

	const jsonLd = $derived({
		'@context': 'https://schema.org',
		'@type': 'Product',
		name: p.title,
		description: p.metaDescription ?? p.summary ?? p.title,
		image: p.images.map((i) => i.url),
		...(p.category ? { category: p.category.name } : {}),
		...(data.rating.count
			? {
					aggregateRating: {
						'@type': 'AggregateRating',
						ratingValue: data.rating.average,
						reviewCount: data.rating.count
					}
				}
			: {}),
		...(data.reviews.length
			? {
					review: data.reviews.slice(0, 5).map((r) => ({
						'@type': 'Review',
						reviewRating: { '@type': 'Rating', ratingValue: r.rating },
						author: { '@type': 'Person', name: r.authorName },
						...(r.title ? { name: r.title } : {}),
						reviewBody: r.body
					}))
				}
			: {}),
		offers: {
			'@type': 'AggregateOffer',
			priceCurrency: data.store.currency,
			lowPrice: (Math.min(...prices) / 100).toFixed(2),
			highPrice: (Math.max(...prices) / 100).toFixed(2),
			offerCount: p.variants.length,
			availability: anyAvailable
				? 'https://schema.org/InStock'
				: 'https://schema.org/OutOfStock',
			url: `${appPage.url.origin}${appPage.url.pathname}`
		}
	});

	const breadcrumbs = $derived({
		'@context': 'https://schema.org',
		'@type': 'BreadcrumbList',
		itemListElement: [
			{ '@type': 'ListItem', position: 1, name: 'Home', item: appPage.url.origin },
			...(p.category
				? [{ '@type': 'ListItem', position: 2, name: p.category.name, item: `${appPage.url.origin}/c/${p.category.slug}` }]
				: []),
			{ '@type': 'ListItem', position: p.category ? 3 : 2, name: p.title }
		]
	});

	let adding = $state(false);
	let newRating = $state(0);

	const when = (d: Date | string) =>
		new Intl.DateTimeFormat(data.store.numberLocale, { dateStyle: 'medium' }).format(new Date(d));
</script>


<JsonLd data={jsonLd} />
<JsonLd data={breadcrumbs} />

{#if p.category}
	<nav class="crumbs"><a href="/c/{p.category.slug}">{p.category.name}</a> <span>/</span> {p.title}</nav>
{/if}

<div class="pdp">
	<!-- gallery -->
	<div class="gallery">
		<div class="main">
			{#if showingVideo && videoId}
				<iframe
					src="https://www.youtube-nocookie.com/embed/{videoId}"
					title="{p.title} video"
					allow="accelerometer; clipboard-write; encrypted-media; picture-in-picture"
					allowfullscreen
				></iframe>
			{:else if p.images[activeImage]}
				<img
					src={p.images[activeImage].url}
					alt={p.images[activeImage].alt ?? p.title}
					width={p.images[activeImage].width ?? undefined}
					height={p.images[activeImage].height ?? undefined}
				/>
			{:else}
				<div class="placeholder" aria-hidden="true"></div>
			{/if}
		</div>

		{#if p.images.length > 1 || videoId}
			<ul class="thumbs">
				{#each p.images as image, i (image.url)}
					<li>
						<button
							type="button"
							aria-label="View image {i + 1} of {p.images.length}"
							aria-current={!showingVideo && i === activeImage}
							onclick={() => {
								activeImage = i;
								showingVideo = false;
							}}
						>
							<img src={image.url} alt="" loading="lazy" />
						</button>
					</li>
				{/each}

				{#if videoId}
					<li>
						<button
							type="button"
							class="video-thumb"
							aria-label="Watch the product video"
							aria-current={showingVideo}
							onclick={() => (showingVideo = true)}
						>
							<img src="https://i.ytimg.com/vi/{videoId}/mqdefault.jpg" alt="" loading="lazy" />
							<span class="play" aria-hidden="true">▶</span>
						</button>
					</li>
				{/if}
			</ul>
		{/if}
	</div>

	<!-- buy box -->
	<div class="buy">
		<h1>{p.title}</h1>

		{#if data.rating.count}
			<a href="#reviews" class="rating-link">
				<Stars rating={data.rating.average} />
				<span>{data.rating.average.toFixed(1)} · {data.rating.count} {data.rating.count === 1 ? 'review' : 'reviews'}</span>
			</a>
		{/if}

		{#if p.summary}<p class="summary">{p.summary}</p>{/if}

		<p class="price">
			{money(priceMinor)}
			{#if compareMinor}<s>{money(compareMinor)}</s>{/if}
		</p>

		{#each p.options as option (option.id)}
			<fieldset>
				<legend>{option.name}</legend>
				<div class="values">
					<!-- Sold out is state, so it is spoken as well as drawn. A swatch
					     has no visible text at all, hence the explicit label. -->
					{#each option.values as value (value.id)}
						{@const isSwatch = Boolean(value.swatchHex)}
						{@const ok = reachable(option.id, value.id)}
						<button
							type="button"
							class:swatch={isSwatch}
							class:on={picked[option.id] === value.id}
							class:out={!ok && picked[option.id] !== value.id}
							style={isSwatch ? `--swatch:${value.swatchHex}` : undefined}
							title={value.value}
							aria-pressed={picked[option.id] === value.id}
							aria-disabled={!ok && picked[option.id] !== value.id ? 'true' : undefined}
							aria-label={isSwatch || !ok
								? `${value.value}${!ok && picked[option.id] !== value.id ? ' — sold out' : ''}`
								: undefined}
							onclick={() => (picked = { ...picked, [option.id]: value.id })}
						>
							{isSwatch ? '' : value.value}
						</button>
					{/each}
				</div>
			</fieldset>
		{/each}

		<form
			method="POST"
			action="/cart?/add"
			use:enhance={() => {
				adding = true;
				return async ({ update }) => {
					await update({ reset: false });
					adding = false;
				};
			}}
		>
			<input type="hidden" name="variantId" value={selected?.id ?? ''} />
			<input type="hidden" name="qty" value="1" />
			<button class="cta" disabled={!buyable || adding}>
				{#if needsChoice}
					Choose {p.options.map((o) => o.name).join(' and ')}
				{:else if adding}
					Adding…
				{:else if buyable}
					Add to bag
				{:else}
					Sold out
				{/if}
			</button>
		</form>

		{#if form?.error}
			<p class="err" role="alert">{form.error}</p>
		{:else if form?.added}
			<p class="ok">Added. <a href="/cart">View bag →</a></p>
		{/if}

		{#if selected && selected.available > 0 && selected.available <= 3}
			<p class="low">Only {selected.available} left</p>
		{/if}

		<p class="cod">Cash on delivery available.</p>

	</div>
</div>

<!-- Everything below is full width: the buy column is for deciding, these are
     for convincing. -->

{#if p.description || data.specs.length}
	<section class="panel" id="details">
		<h2>Details</h2>
		<div class="details">
			{#if p.description}
				<div class="description">{p.description}</div>
			{:else}
				<p class="muted">{p.summary ?? 'No description yet.'}</p>
			{/if}

			{#if data.specs.length}
				<table class="specs">
					<caption>Specifications</caption>
					<tbody>
						{#each data.specs as spec (spec.name)}
							<tr>
								<th scope="row">{spec.name}</th>
								<td>{spec.value}{#if spec.unit}{' '}{spec.unit}{/if}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			{/if}
		</div>
	</section>
{/if}

<section class="panel" id="reviews">
	<h2>Reviews</h2>

	{#if data.rating.count}
		<Rating summary={data.rating} />
	{:else}
		<p class="muted">No reviews yet. If you have bought this, yours would be the first.</p>
	{/if}

	{#if data.reviews.length}
		<ul class="reviews">
			{#each data.reviews as review (review.id)}
				<li>
					<div class="head">
						<Stars rating={review.rating} />
						<strong>{review.authorName}</strong>
						{#if review.isVerified}
							<span class="verified">Verified purchase</span>
						{/if}
						<time datetime={new Date(review.createdAt).toISOString()}>{when(review.createdAt)}</time>
					</div>
					{#if review.title}<p class="rtitle">{review.title}</p>{/if}
					<p class="rbody">{review.body}</p>

					{#if review.reply}
						<div class="reply">
							<p class="who">Reply from {data.store.name}</p>
							<p>{review.reply}</p>
						</div>
					{/if}
				</li>
			{/each}
		</ul>
	{/if}

	<details class="writer">
		<summary>Write a review</summary>

		{#if form?.reviewed}
			<p class="ok" role="status">
				Thank you. Your review is with the shop and appears once they have read it.
			</p>
		{:else}
			<form method="POST" action="?/review" use:enhance class="form">
				{#if form?.reviewError}
					<p class="err" role="alert">{form.reviewError}</p>
				{/if}

				<fieldset class="stars-input">
					<legend>Your rating</legend>
					{#each [1, 2, 3, 4, 5] as star (star)}
						<label class="star-radio">
							<input type="radio" name="rating" value={star} bind:group={newRating} required />
							<span aria-hidden="true" class:on={newRating >= star}>★</span>
							<span class="sr-only">{star} {star === 1 ? 'star' : 'stars'}</span>
						</label>
					{/each}
				</fieldset>

				<label>
					<span>Your name</span>
					<input name="name" required autocomplete="name" />
				</label>

				<label>
					<span>Phone</span>
					<input name="phone" type="tel" inputmode="numeric" required autocomplete="tel" />
					<small>Not shown publicly. Used to confirm you ordered this.</small>
				</label>

				<label>
					<span>Headline <em>(optional)</em></span>
					<input name="title" maxlength="80" />
				</label>

				<label>
					<span>Your review</span>
					<textarea name="body" rows="4" required minlength="10"></textarea>
				</label>

				<button class="cta">Submit review</button>
			</form>
		{/if}
	</details>
</section>

<section class="panel" id="questions">
	<h2>Questions</h2>

	{#if data.questions.length}
		<ul class="qa">
			{#each data.questions as item (item.id)}
				<li>
					<p class="q"><span aria-hidden="true">Q</span> {item.body}</p>
					{#if item.answer}
						<p class="a"><span aria-hidden="true">A</span> {item.answer}</p>
					{/if}
				</li>
			{/each}
		</ul>
	{:else}
		<p class="muted">No questions yet. Ask anything about size, fabric or delivery.</p>
	{/if}

	<details class="writer">
		<summary>Ask a question</summary>

		{#if form?.asked}
			<p class="ok" role="status">
				Asked. The shop will reply to you directly, and publish the answer here if it
				helps other customers.
			</p>
		{:else}
			<form method="POST" action="?/question" use:enhance class="form">
				{#if form?.questionError}
					<p class="err" role="alert">{form.questionError}</p>
				{/if}

				<label>
					<span>Your name</span>
					<input name="name" required autocomplete="name" />
				</label>

				<label>
					<span>Phone</span>
					<input name="phone" type="tel" inputmode="numeric" required autocomplete="tel" />
					<small>So the shop can answer you directly. Never shown publicly.</small>
				</label>

				<label>
					<span>Your question</span>
					<textarea name="body" rows="3" required minlength="5"></textarea>
				</label>

				<button class="cta">Send question</button>
			</form>
		{/if}
	</details>
</section>

{#if data.alsoLike.length}
	<section class="panel" id="also-like">
		<h2>You may also like</h2>
		<ProductGrid
			items={data.alsoLike}
			currency={data.store.currency}
			locale={data.store.numberLocale}
		/>
	</section>
{/if}

<style>
	/* ── below the fold ─────────────────────────────────────────────── */

	.panel {
		border-block-start: 1px solid var(--c-line);
		margin-block-start: 3rem;
		padding-block-start: 2.5rem;
	}
	.panel h2 {
		font-family: var(--font-display);
		font-size: 1.375rem;
		font-weight: 500;
		margin: 0 0 1.5rem;
	}
	.muted {
		color: var(--c-muted);
	}

	.details {
		display: grid;
		gap: 2rem;
	}
	@media (min-width: 56rem) {
		.details {
			grid-template-columns: 3fr 2fr;
			gap: 3rem;
			align-items: start;
		}
	}
	.description {
		white-space: pre-wrap;
		line-height: var(--leading-body, 1.6);
		max-inline-size: 62ch;
	}

	.rating-link {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.875rem;
		color: var(--c-muted);
		text-decoration: none;
		margin-block-end: 0.75rem;
	}
	.rating-link:hover {
		color: var(--c-text);
	}

	.reviews,
	.qa {
		list-style: none;
		margin: 2rem 0 0;
		padding: 0;
		display: grid;
		gap: 1.5rem;
	}
	.reviews li,
	.qa li {
		border-block-end: 1px solid var(--c-line);
		padding-block-end: 1.5rem;
	}
	.reviews .head {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.625rem;
		font-size: 0.875rem;
	}
	.reviews time {
		color: var(--c-muted);
		margin-inline-start: auto;
	}
	.verified {
		font-size: 0.75rem;
		color: #1a7f4b;
		border: 1px solid currentColor;
		border-radius: 999px;
		padding: 0.0625rem 0.5rem;
	}
	.rtitle {
		font-weight: 600;
		margin: 0.625rem 0 0.25rem;
	}
	.rbody {
		margin: 0.25rem 0 0;
		line-height: var(--leading-body, 1.6);
	}
	.reply {
		margin-block-start: 0.875rem;
		padding-inline-start: 0.875rem;
		border-inline-start: 2px solid var(--c-line);
	}
	.reply .who {
		font-size: 0.8125rem;
		font-weight: 600;
		margin: 0 0 0.25rem;
	}
	.reply p {
		margin: 0;
		font-size: 0.9375rem;
		color: var(--c-muted);
	}

	.qa .q,
	.qa .a {
		display: grid;
		grid-template-columns: 1.5rem 1fr;
		gap: 0.5rem;
		margin: 0;
		line-height: var(--leading-body, 1.6);
	}
	.qa .q span,
	.qa .a span {
		font-weight: 700;
		font-size: 0.8125rem;
		color: var(--c-muted);
	}
	.qa .a {
		margin-block-start: 0.625rem;
		color: var(--c-muted);
	}

	.writer {
		margin-block-start: 2rem;
	}
	.writer summary {
		cursor: pointer;
		font-weight: 500;
		padding: 0.625rem 0;
	}
	.form {
		display: grid;
		gap: 1rem;
		max-inline-size: 34rem;
		margin-block-start: 0.75rem;
	}
	.form label {
		display: grid;
		gap: 0.375rem;
		font-size: 0.875rem;
	}
	.form label em {
		font-style: normal;
		color: var(--c-muted);
	}
	.form input,
	.form textarea {
		font: inherit;
		padding: 0.625rem 0.75rem;
		border: 1px solid var(--c-line);
		border-radius: var(--radius);
		background: var(--c-surface);
		color: inherit;
	}
	.form small {
		color: var(--c-muted);
		font-size: 0.75rem;
	}

	.stars-input {
		border: 0;
		padding: 0;
		margin: 0;
		display: flex;
		align-items: center;
		gap: 0.25rem;
	}
	.stars-input legend {
		font-size: 0.875rem;
		margin-block-end: 0.375rem;
	}
	.star-radio {
		cursor: pointer;
		font-size: 1.75rem;
		line-height: 1;
		color: var(--c-line);
	}
	.star-radio span.on {
		color: #e0a516;
	}
	/* Visually hidden, still focusable — the ring must land on the star. */
	.star-radio input {
		position: absolute;
		opacity: 0;
		inline-size: 1px;
		block-size: 1px;
	}
	.star-radio:focus-within span[aria-hidden='true'] {
		outline: 2px solid var(--c-accent);
		outline-offset: 2px;
		border-radius: 2px;
	}
	.sr-only {
		position: absolute;
		inline-size: 1px;
		block-size: 1px;
		overflow: hidden;
		clip-path: inset(50%);
	}

	.main iframe {
		inline-size: 100%;
		block-size: 100%;
		border: 0;
	}
	.video-thumb {
		position: relative;
	}
	.video-thumb .play {
		position: absolute;
		inset: 0;
		display: grid;
		place-items: center;
		color: #fff;
		font-size: 0.875rem;
		background: rgb(0 0 0 / 0.35);
	}

	.crumbs {
		font-size: 0.875rem;
		color: var(--c-muted);
		margin-block-end: 1.5rem;
	}
	.crumbs a {
		color: inherit;
	}

	.pdp {
		display: grid;
		gap: var(--grid-gap);
		align-items: start;
		/* Centred as a pair, so neither column floats on its own. */
		max-inline-size: 64rem;
		margin-inline: auto;
	}

	@media (min-width: 56rem) {
		.pdp {
			/* Not 3fr 2fr: on a wide screen that made the photo a metre tall and
			   left the buy box floating in whitespace. */
			grid-template-columns: minmax(0, 30rem) minmax(20rem, 1fr);
			gap: 4rem;
		}
	}

	/* Capping the column, not just the image: with a 4/5 ratio the width is what
	   drives the height, so a wide column produces a metre-tall photo. */
	.gallery {
		inline-size: 100%;
		max-inline-size: 30rem;
		margin-inline: auto;
	}
	@media (min-width: 56rem) {
		/* Its column is already capped, so centring again only adds dead space. */
		.gallery {
			margin-inline: 0;
		}
	}

	.main {
		aspect-ratio: var(--card-aspect);
		max-block-size: 62vh;
		margin-inline: auto;
		background: var(--c-surface);
		border-radius: var(--radius);
		overflow: hidden;
	}

	/* The buy box follows you down a long gallery rather than scrolling away. */
	@media (min-width: 56rem) {
		.buy {
			position: sticky;
			inset-block-start: 1.5rem;
		}
	}

	.main img,
	.placeholder {
		inline-size: 100%;
		block-size: 100%;
		object-fit: cover;
		display: block;
	}

	.placeholder {
		background: var(--c-line);
	}

	.thumbs {
		display: flex;
		gap: 0.5rem;
		list-style: none;
		margin: 0.75rem 0 0;
		padding: 0;
		overflow-x: auto;
		/* Centred under a centred photo, or the strip drifts left of it. */
		justify-content: center;
		scrollbar-width: thin;
	}
	.thumbs button {
		inline-size: 4.5rem;
		aspect-ratio: 1;
		padding: 0;
		border: 1px solid transparent;
		border-radius: calc(var(--radius) * 0.75);
		background: var(--c-surface);
		overflow: hidden;
		cursor: pointer;
		opacity: 0.65;
		transition: opacity 120ms ease, border-color 120ms ease;
	}
	.thumbs button:hover,
	.thumbs button[aria-current='true'] {
		opacity: 1;
		border-color: var(--c-accent);
	}
	.thumbs img {
		inline-size: 100%;
		block-size: 100%;
		object-fit: cover;
		display: block;
	}

	.thumbs button {
		inline-size: 4rem;
		block-size: 4rem;
		padding: 0;
		border: 2px solid transparent;
		border-radius: var(--radius);
		overflow: hidden;
		cursor: pointer;
		background: none;
	}

	.thumbs button[aria-current='true'] {
		border-color: var(--c-accent);
	}

	.thumbs img {
		inline-size: 100%;
		block-size: 100%;
		object-fit: cover;
		display: block;
	}

	h1 {
		font-family: var(--font-display);
		font-weight: 400;
		font-size: 1.75rem;
		margin: 0 0 0.5rem;
	}

	.summary {
		color: var(--c-muted);
		margin: 0 0 1rem;
	}

	.price {
		font-size: 1.75rem;
		font-weight: 600;
		letter-spacing: -0.01em;
		margin: 0 0 0.25rem;
	}
	.price s {
		font-size: 1.125rem;
		font-weight: 400;
		color: var(--c-muted);
		margin-inline-start: 0.5rem;
	}

	/* The buy column is a stack with one rhythm, not a pile of ad-hoc margins. */
	.buy {
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
		align-items: stretch;
	}
	.buy > * {
		margin: 0;
	}
	.buy h1 {
		font-size: 1.75rem;
		line-height: 1.25;
		margin: 0;
	}
	.buy .summary {
		color: var(--c-muted);
		line-height: var(--leading-body, 1.6);
	}
	/* The price belongs with the title, not floating a gap away from it. */
	.buy .rating-link + .price,
	.buy h1 + .price {
		margin-block-start: -0.5rem;
	}

	.price s {
		color: var(--c-muted);
		font-size: 1rem;
		margin-inline-start: 0.5rem;
	}

	fieldset {
		border: 0;
		padding: 0;
		margin: 0;
	}
	legend {
		font-size: 0.875rem;
		color: var(--c-muted);
		margin-block-end: 0.5rem;
		padding: 0;
	}

	legend {
		font-size: 0.875rem;
		color: var(--c-muted);
		padding: 0;
		margin-block-end: 0.5rem;
	}

	.values {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.values button {
		min-inline-size: 2.75rem;
		padding: 0.5rem 0.875rem;
		border: 1px solid var(--c-line);
		border-radius: var(--radius);
		background: var(--c-surface);
		font: inherit;
		cursor: pointer;
	}

	.values button.on {
		border-color: var(--c-text);
	}

	/* Sold out must stay readable. At 35% opacity with a line through it, "L"
	   reads as "t" — and opacity alone is not a state a screen reader hears. */
	.values button.out {
		color: var(--c-muted);
		border-style: dashed;
		background: var(--c-bg);
		cursor: not-allowed;
	}

	.values button.swatch {
		inline-size: 2.25rem;
		block-size: 2.25rem;
		min-inline-size: 0;
		padding: 0;
		background: var(--swatch);
	}

	.values button.swatch.on {
		box-shadow: 0 0 0 2px var(--c-surface), 0 0 0 4px var(--c-text);
	}

	.cta {
		inline-size: 100%;
		padding: 0.875rem;
		border: 0;
		border-radius: var(--radius);
		background: var(--c-accent);
		color: var(--c-accent-text);
		font: inherit;
		font-size: 1rem;
		cursor: pointer;
	}

	.cta:disabled {
		background: var(--c-line);
		color: var(--c-muted);
		cursor: not-allowed;
	}

	.err,
	.ok {
		font-size: 0.875rem;
		margin: 0.75rem 0 0;
	}

	.err {
		color: var(--c-sale);
	}

	.ok a {
		color: var(--c-accent);
	}

	.low {
		color: var(--c-sale);
		font-size: 0.875rem;
		margin: 0.75rem 0 0;
	}

	.cod {
		color: var(--c-muted);
		font-size: 0.875rem;
		margin: 1rem 0 0;
	}

	/* A real table, so a screen reader reads "RAM, 16 GB" as a pair. */
	.specs {
		inline-size: 100%;
		margin-block-start: 2rem;
		border-collapse: collapse;
		font-size: 0.9375rem;
	}

	.specs caption {
		text-align: start;
		font-size: 0.8125rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--c-muted);
		padding-block-end: 0.5rem;
	}

	.specs th {
		text-align: start;
		font-weight: 400;
		color: var(--c-muted);
		padding: 0.5rem 1rem 0.5rem 0;
		border-block-end: 1px solid var(--c-line);
		white-space: nowrap;
	}

	.specs td {
		padding: 0.5rem 0;
		border-block-end: 1px solid var(--c-line);
	}

	.description {
		margin-block-start: 2rem;
		padding-block-start: 1.5rem;
		border-block-start: 1px solid var(--c-line);
		white-space: pre-wrap;
		line-height: 1.7;
	}
</style>
