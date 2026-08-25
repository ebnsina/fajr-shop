<!--
  The logo mark. Fajr is dawn, so it is a sun breaking a horizon — the same
  shape as the favicon, drawn once here and reused wherever the name appears.
-->
<script lang="ts">
	let { size = 22, tone = 'brand' }: { size?: number; tone?: 'brand' | 'bone' } = $props();
</script>

<svg
	width={size}
	height={size}
	viewBox="0 0 32 32"
	aria-hidden="true"
	class="shrink-0"
>
	<rect width="32" height="32" rx="7" fill={tone === 'bone' ? '#ffffff' : 'var(--color-primary-600)'} />
	<path d="M9 19a7 7 0 0 1 14 0z" fill={tone === 'bone' ? 'var(--color-void)' : '#ffffff'} />
	<rect
		x="6"
		y="21.5"
		width="20"
		height="2.5"
		rx="1.25"
		fill={tone === 'bone' ? 'var(--color-void)' : '#ffffff'}
		opacity=".9"
	/>
</svg>
