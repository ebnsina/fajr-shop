<script lang="ts">
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import { TranslateFreeIcons } from '@hugeicons/core-free-icons';
	import { getLocale, setLocale, locales } from '$lib/paraglide/runtime';

	// Bangla for staff who work faster in it, English for those who don't.
	const LABEL: Record<string, string> = { en: 'English', bn: 'বাংলা' };

	function cycle() {
		const list = [...locales];
		const next = list[(list.indexOf(getLocale()) + 1) % list.length]!;
		setLocale(next);
	}
</script>

<button
	onclick={cycle}
	class="btn btn-ghost !px-2"
	title="{LABEL[getLocale()]} — click to switch"
	aria-label="Language: {LABEL[getLocale()]}"
>
	<HugeiconsIcon icon={TranslateFreeIcons} size={16} strokeWidth={1.75} aria-hidden="true" />
</button>
