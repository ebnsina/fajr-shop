<script lang="ts">
	import { CONTACT } from '$lib/content';

	// Deliberately the summary, not the contract: every shop is set up under a
	// signed agreement, and this page exists so nobody has to guess what is in it.
	const SECTIONS = [
		{
			q: 'This page is a summary',
			a: 'Every shop we run is covered by a signed agreement between us and the merchant. That agreement is what governs the work. This page says plainly what is in it so you know before you talk to us.'
		},
		{
			q: 'What you pay',
			a: 'A one-off setup fee and a flat monthly fee for the plan you pick. We never take a percentage of your sales. Usage that costs us money per order — SMS, fraud lookups, orders past your plan — is billed at the rates published on the pricing page.'
		},
		{
			q: 'What you own',
			a: 'Your products, customers, orders and content are yours. Ask and you get a full export plus a database dump, in a format another developer can use. We do not hold your data hostage to keep you.'
		},
		{
			q: 'Leaving',
			a: 'Any time, with no notice period beyond the month you have already paid for. Changing plan takes effect the following month, and nobody is upgraded automatically for having a good month.'
		},
		{
			q: 'What we do not do',
			a: 'We are not a payment processor and we never sit between you and your money — courier charges and gateway settlements are between you and them. We do not guarantee sales, delivery rates or ad performance.'
		},
		{
			q: 'Support',
			a: 'Same-day on the plans that say so, during working hours, from the people who built it. If something we run breaks, fixing it is our cost, not yours.'
		}
	];
</script>

<section class="sec">
	<div class="wrap enter max-w-[52rem]">
		<p class="eyebrow mb-6">Terms</p>
		<h1 class="display" style="font-size: var(--text-section)">What you are agreeing to</h1>
		<p class="mt-6 leading-relaxed text-body" style="font-size: var(--text-lead)">
			The plain version. Ask for the full agreement before you sign anything —
			we will send it without being chased.
		</p>

		<dl class="stagger mt-14">
			{#each SECTIONS as s (s.q)}
				<div class="border-t border-line py-6">
					<dt class="tile-title">{s.q}</dt>
					<dd class="mt-2 max-w-[62ch] leading-relaxed text-muted">{s.a}</dd>
				</div>
			{/each}
		</dl>

		<div class="mt-10 flex flex-wrap gap-3">
			<a href="/pricing" class="btn btn-primary">See the pricing</a>
			<a href="mailto:{CONTACT.email}" class="btn btn-secondary">Ask for the agreement</a>
		</div>
	</div>
</section>
