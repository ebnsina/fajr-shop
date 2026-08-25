<script lang="ts">
	export type Tone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

	let {
		tone = 'neutral',
		children
	}: { tone?: Tone; children: import('svelte').Snippet } = $props();
</script>

<span class="badge" data-tone={tone}>{@render children()}</span>
