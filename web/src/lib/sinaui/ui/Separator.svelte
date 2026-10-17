<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		orientation?: 'horizontal' | 'vertical';
		/** Text in the middle of the line ("or"). */
		children?: Snippet;
		class?: string;
	}

	let { orientation = 'horizontal', children, class: className }: Props = $props();
</script>

{#if children}
	<!-- With words it's just text between two lines; a separator's own content isn't read out. -->
	<div class={['labeled', className]}>{@render children()}</div>
{:else if orientation === 'vertical'}
	<div class={['line', 'vertical', className]} role="separator" aria-orientation="vertical"></div>
{:else}
	<hr class={['line', className]} />
{/if}

<style>
	.line {
		flex: none;
		margin: 0;
		border: 0;
		background: var(--ui-line);
		block-size: 1px;
	}
	.vertical {
		align-self: stretch;
		inline-size: 1px;
		block-size: auto;
		min-block-size: 1em;
	}
	.labeled {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		color: var(--ui-muted);
		font: 0.8125rem/1.4 var(--ui-font);
		white-space: nowrap;
	}
	.labeled::before,
	.labeled::after {
		content: '';
		flex: 1;
		block-size: 1px;
		background: var(--ui-line);
	}
</style>
