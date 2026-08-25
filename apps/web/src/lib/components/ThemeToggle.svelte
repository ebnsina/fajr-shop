<script lang="ts">
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import {
		ComputerPhoneSyncFreeIcons,
		Moon02FreeIcons,
		Sun02FreeIcons
	} from '@hugeicons/core-free-icons';

	// Three states: system (nothing stored), light, dark.
	let mode = $state<'system' | 'light' | 'dark'>('system');

	$effect(() => {
		try {
			mode = (localStorage.getItem('admin-theme') as typeof mode) ?? 'system';
		} catch {
			// Private windows and blocked site data both throw. Stay on system.
		}
	});

	function cycle() {
		mode = mode === 'system' ? 'light' : mode === 'light' ? 'dark' : 'system';
		const root = document.documentElement;
		if (mode === 'system') root.removeAttribute('data-theme');
		else root.setAttribute('data-theme', mode);
		try {
			if (mode === 'system') localStorage.removeItem('admin-theme');
			else localStorage.setItem('admin-theme', mode);
		} catch {
			/* the toggle still works for this page view */
		}
	}

	const glyph = $derived(
		mode === 'dark' ? Moon02FreeIcons : mode === 'light' ? Sun02FreeIcons : ComputerPhoneSyncFreeIcons
	);
</script>

<button onclick={cycle} class="btn btn-ghost !px-2" title="Theme: {mode}" aria-label="Theme: {mode}">
	<HugeiconsIcon icon={glyph} size={16} strokeWidth={1.75} />
</button>
