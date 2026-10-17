<script lang="ts">
	import Mail from '@lucide/svelte/icons/mail';
	import { enhance } from '$app/forms';
	import { errorText, home as t } from '#lib/copy.js';
	import { toast } from '#lib/sinaui/ui/toast/index.js';

	// Posts to /newsletter, which works without scripts too.
	let sending = $state(false);
</script>

<section class="newsletter" aria-labelledby="newsletter-title">
	<div class="row">
		<Mail size={36} strokeWidth={1.5} aria-hidden="true" />
		<div class="text">
			<h2 id="newsletter-title">{t.newsletterTitle}</h2>
			<p>{t.newsletterText}</p>
		</div>
		<form
			method="POST"
			action="/newsletter"
			use:enhance={() => {
				sending = true;
				return async ({ result, update }) => {
					sending = false;
					if (result.type === 'success') {
						toast.success(t.newsletterThanks);
						await update();
					} else if (result.type === 'failure') {
						toast.error(String(result.data?.message ?? errorText('internal')));
					}
				};
			}}
		>
			<label class="sr" for="newsletter-email">{t.newsletterEmail}</label>
			<input
				id="newsletter-email"
				name="email"
				type="email"
				required
				autocomplete="email"
				placeholder={t.newsletterEmail}
			/>
			<button type="submit" disabled={sending}>{t.newsletterButton}</button>
		</form>
	</div>
</section>

<style>
	.newsletter {
		margin-block-start: 4rem;
		background: var(--ui-accent);
		color: var(--ui-on-accent);
	}
	.row {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 1rem 1.5rem;
		box-sizing: border-box;
		inline-size: min(80rem, 100%);
		margin-inline: auto;
		padding: 1.75rem 1rem;
	}
	.text {
		flex: 1 1 18rem;
	}
	h2 {
		margin: 0;
		font-size: 1.125rem;
		text-transform: uppercase;
		letter-spacing: 0.02em;
	}
	p {
		margin: 0.25rem 0 0;
		opacity: 0.9;
		font-size: 0.875rem;
	}
	form {
		display: flex;
		flex: 1 1 22rem;
		gap: 0.5rem;
	}
	input {
		flex: 1;
		min-inline-size: 0;
		block-size: 2.625rem;
		padding-inline: 0.875rem;
		border: 0;
		border-radius: var(--ui-radius-control);
		background: var(--ui-surface);
		color: var(--ui-fg);
		font: 0.9375rem var(--ui-font);
	}
	button {
		padding-inline: 1.25rem;
		border: 1px solid currentColor;
		border-radius: var(--ui-radius-control);
		background: transparent;
		color: inherit;
		font: 600 0.9375rem var(--ui-font);
		cursor: pointer;
	}
	button:hover:not(:disabled) {
		background: color-mix(in srgb, var(--ui-on-accent) 12%, transparent);
	}
	:is(input, button):focus-visible {
		outline: var(--ui-ring-width) solid var(--ui-on-accent);
		outline-offset: 2px;
	}
	.sr {
		position: absolute;
		inline-size: 1px;
		block-size: 1px;
		overflow: hidden;
		clip-path: inset(50%);
	}
</style>
