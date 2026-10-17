<script lang="ts">
	import Mail from '@lucide/svelte/icons/mail';
	import Phone from '@lucide/svelte/icons/phone';
	import type { components } from '#lib/api.js';
	import { account as a, cart as c, storefront as sf, shop as t } from '#lib/copy.js';

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
				<p class="label">{sf.hotlineHours}</p>
				<a class="phone" href="tel:{store.contact_phone}"
					><Phone size={18} /> {store.contact_phone}</a
				>
			{/if}
			{#if store.contact_email}
				<a href="mailto:{store.contact_email}"><Mail size={15} /> {store.contact_email}</a>
			{/if}
		</div>
		<nav aria-label={sf.shop}>
			<h2>{sf.shop}</h2>
			{#each nav.slice(0, 8) as link (link.href)}<a href={link.href}>{link.label}</a>{/each}
		</nav>
		<nav aria-label={sf.myAccount}>
			<h2>{sf.myAccount}</h2>
			<a href="/account/login">{a.signIn}</a>
			<a href="/account/register">{a.register}</a>
			<a href="/cart">{c.title}</a>
		</nav>
		<nav aria-label={sf.service}>
			<h2>{sf.service}</h2>
			{#if store.contact_phone}<a href="tel:{store.contact_phone}">{sf.contact}</a>{/if}
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
		border-start-start-radius: 2rem;
		border-start-end-radius: 2rem;
		background: var(--footer-bg);
		color: var(--footer-text);
		font-size: 0.875rem;
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
		grid-template-columns: minmax(0, 1.6fr) repeat(3, minmax(0, 1fr));
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
		color: var(--footer-heading);
		font-size: 1.25rem;
		font-weight: 700;
	}
	.label {
		margin: 0.5rem 0 0;
	}
	.phone {
		color: var(--footer-heading);
		font-size: 1.25rem;
		font-weight: 700;
	}
	h2 {
		margin: 0 0 0.25rem;
		color: var(--footer-heading);
		font-size: 0.8125rem;
		letter-spacing: 0.04em;
		text-transform: uppercase;
	}
	a {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		color: var(--footer-heading);
		text-decoration: none;
	}
	a:hover {
		text-decoration: underline;
	}
	a:focus-visible {
		outline: var(--ui-ring-width) solid var(--ui-ring);
		outline-offset: var(--ui-ring-offset);
		border-radius: 2px;
	}
	.bottom {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		gap: 0.5rem 2rem;
		padding-block: 1.25rem;
		border-block-start: 1px solid var(--footer-line);
		font-size: 0.8125rem;
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
