<script lang="ts">
	import { orderCopy as t } from '#lib/copy.js';
	import Badge from '#lib/sinaui/ui/Badge.svelte';

	// An order's status in words, with the badge's icon, so it never rests on color alone.
	let { status }: { status: string } = $props();
	const tone = $derived(
		status === 'cancelled'
			? 'danger'
			: status === 'pending'
				? 'warning'
				: status === 'delivered'
					? 'neutral'
					: 'accent'
	);
</script>

<Badge {tone}>{t.statuses[status] ?? status}</Badge>
