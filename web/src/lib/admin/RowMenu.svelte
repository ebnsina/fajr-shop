<script lang="ts">
	import { MoreHorizontalIcon } from '@hugeicons/core-free-icons';
	import Button from '#lib/sinaui/ui/Button.svelte';
	import * as Dropdown from '#lib/sinaui/ui/dropdown/index.js';
	import Icon from '#lib/sinaui/ui/Icon.svelte';

	// A table row's actions behind one "⋯" button, so rows stay calm and every action is the same place.
	export type RowAction = {
		label: string;
		href?: string;
		onselect?: () => void;
		danger?: boolean;
		/** A line before this item, to set apart the risky ones. */
		separate?: boolean;
	};
	let { label, actions }: { label: string; actions: RowAction[] } = $props();
</script>

<Dropdown.Root>
	{#snippet trigger(props)}
		<Button {...props} variant="ghost" size="sm" square aria-label={label}>
			<Icon icon={MoreHorizontalIcon} size={18} />
		</Button>
	{/snippet}
	{#each actions as a (a.label)}
		{#if a.separate}<Dropdown.Separator />{/if}
		<Dropdown.Item
			href={a.href}
			variant={a.danger ? 'danger' : 'default'}
			onselect={() => a.onselect?.()}>{a.label}</Dropdown.Item
		>
	{/each}
</Dropdown.Root>
