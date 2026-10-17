<script lang="ts">
	import { CallIcon, Mail01Icon } from '@hugeicons/core-free-icons';
	import type { components } from '#lib/api.js';
	import { cart as c, storefront as sf, shop as t } from '#lib/copy.js';
	import Icon from '#lib/sinaui/ui/Icon.svelte';

	let {
		store,
		nav
	}: {
		store: components['schemas']['Store'];
		nav: { label: string; href: string }[];
	} = $props();
	const year = new Date().getFullYear();
</script>

<footer class="footer">
	<div class="cols">
		<div class="brand">
			{#if store.logo_url}<img src={store.logo_url} alt={store.name} />{:else}<p class="name">
					{store.name}
				</p>{/if}
			{#if store.contact_phone}
				<p class="label">{sf.contact}</p>
				<a class="phone" href="tel:{store.contact_phone}"
					><Icon icon={CallIcon} size={18} /> {store.contact_phone}</a
				>
			{/if}
			{#if store.contact_email}
				<a href="mailto:{store.contact_email}"
					><Icon icon={Mail01Icon} size={16} /> {store.contact_email}</a
				>
			{/if}
		</div>
		<nav aria-label={sf.shop}>
			<h2>{sf.shop}</h2>
			{#each nav as link (link.href)}<a href={link.href}>{link.label}</a>{/each}
		</nav>
		<nav aria-label={sf.help}>
			<h2>{sf.help}</h2>
			<a href="/cart">{c.title}</a>
			<a href="/search">{t.search}</a>
		</nav>
	</div>
	<div class="bottom">
		<p>© {year} {store.name}</p>
		<p>{sf.cod}</p>
	</div>
</footer>

<style>
	.footer {
		margin-block-start: 4rem;
		background: var(--ui-surface);
		color: var(--ui-muted);
		font-size: 0.9375rem;
	}
	.cols,
	.bottom {
		box-sizing: border-box;
		inline-size: min(80rem, 100%);
		margin-inline: auto;
		padding-inline: 1rem;
	}
	.cols {
		display: grid;
		grid-template-columns: minmax(0, 2fr) repeat(2, minmax(0, 1fr));
		gap: 2rem;
		padding-block: 3rem 2rem;
	}
	.brand,
	nav {
		display: grid;
		align-content: start;
		gap: 0.625rem;
	}
	.brand img {
		max-block-size: 3rem;
		max-inline-size: 11rem;
		object-fit: contain;
	}
	.name {
		margin: 0;
		color: var(--ui-fg);
		font-family: var(--font-heading);
		font-size: 1.375rem;
		font-weight: 700;
	}
	.label {
		margin: 0.5rem 0 0;
	}
	.phone {
		color: var(--ui-fg);
		font-family: var(--font-heading);
		font-size: 1.375rem;
		font-weight: 700;
	}
	h2 {
		margin: 0 0 0.25rem;
		color: var(--ui-fg);
		font-size: 0.875rem;
		letter-spacing: 0.04em;
		text-transform: uppercase;
	}
	a {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		color: inherit;
		text-decoration: none;
	}
	a:hover {
		color: var(--ui-accent);
	}
	.bottom {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		gap: 0.5rem 2rem;
		padding-block: 1.25rem;
		box-shadow: 0 -1px 0 var(--ui-line);
		font-size: 0.875rem;
	}
	.bottom p {
		margin: 0;
	}
	@media (width < 48rem) {
		.cols {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
		.brand {
			grid-column: 1 / -1;
		}
	}
</style>
