<script lang="ts">
	import type { components } from '#lib/api.js';
	import { shop as t } from '#lib/copy.js';

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
		<div>
			<p class="name">{store.name}</p>
			{#if store.contact_phone || store.contact_email}
				<p class="contact">
					<span class="sr">{t.contact}: </span>
					{#if store.contact_phone}<a href="tel:{store.contact_phone}">{store.contact_phone}</a
						>{/if}
					{#if store.contact_email}<a href="mailto:{store.contact_email}">{store.contact_email}</a
						>{/if}
				</p>
			{/if}
		</div>
		<nav aria-label={t.all}>
			{#each nav as link (link.href)}<a href={link.href}>{link.label}</a>{/each}
		</nav>
	</div>
	<p class="legal">© {year} {store.name}</p>
</footer>

<style>
	.footer {
		box-sizing: border-box;
		inline-size: min(76rem, 100%);
		margin: 6rem auto 0;
		padding: 2.5rem 1rem 2rem;
		color: var(--ui-muted);
		font-size: 0.875rem;
	}
	.cols {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		gap: 2rem;
	}
	.name {
		margin: 0 0 0.5rem;
		color: var(--ui-fg);
		font-weight: 650;
	}
	.contact {
		display: grid;
		gap: 0.25rem;
		margin: 0;
	}
	nav {
		display: grid;
		gap: 0.5rem;
	}
	a {
		color: inherit;
	}
	.legal {
		margin: 2rem 0 0;
	}
	.sr {
		position: absolute;
		inline-size: 1px;
		block-size: 1px;
		overflow: hidden;
		clip-path: inset(50%);
	}
</style>
