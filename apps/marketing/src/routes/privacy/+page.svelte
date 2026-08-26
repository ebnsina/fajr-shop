<script lang="ts">
	import { CONTACT } from '$lib/content';

	// Written from what the code actually does: the contact form writes one row
	// per person to the leads database and we call them back. Nothing else is
	// collected on this site, so nothing else is claimed here.
	const SECTIONS = [
		{
			q: 'What this site collects',
			a: 'Only what you type into the contact or demo form: your name, mobile number, shop name, roughly how many orders you take a month, and anything you write in the message box. Nothing is collected if you only read the page — no analytics script, no advertising pixel, no cookie for tracking.'
		},
		{
			q: 'Why we hold it',
			a: 'To call or message you back about the enquiry you sent, and to know which plan to quote. That is the whole purpose. A repeat enquiry from the same number updates the one record rather than creating a second.'
		},
		{
			q: 'Who else sees it',
			a: 'Nobody. It is not sold, not shared with advertisers, and not used to build a profile. It sits in our own database on our own server.'
		},
		{
			q: 'How long we keep it',
			a: 'Until you ask us to delete it, or until an enquiry has gone nowhere for two years — whichever comes first.'
		},
		{
			q: 'Getting a copy, or getting it deleted',
			a: `Message the number or email below and say which you want. We will do it and tell you when it is done. You do not need a reason.`
		},
		{
			q: 'A shop built on Fajr Shop is separate',
			a: 'This page covers fajr.shop only. A merchant running a shop on our software is the one responsible for their own customers’ data; what we do with it on their behalf is set out in their contract, not here.'
		}
	];
</script>

<section class="sec">
	<div class="wrap max-w-[52rem]">
		<p class="eyebrow mb-6">Privacy</p>
		<h1 class="display" style="font-size: var(--text-section)">What we do with your details</h1>
		<p class="mt-6 leading-relaxed text-body" style="font-size: var(--text-lead)">
			Short, because we collect very little. If anything here is unclear, ask —
			the number below is a person.
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
			<a href="https://wa.me/{CONTACT.whatsapp}" class="btn btn-whatsapp">Message us on WhatsApp</a>
			<a href="mailto:{CONTACT.email}" class="btn btn-secondary">{CONTACT.email}</a>
		</div>
	</div>
</section>
