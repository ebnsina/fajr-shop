<script lang="ts">
	import type { components } from '#lib/api.js';
	import { shippingAdmin as t } from '#lib/copy.js';
	import Button from '#lib/sinaui/ui/Button.svelte';
	import Checkbox from '#lib/sinaui/ui/Checkbox.svelte';

	type District = components['schemas']['District'];

	// The 64 districts by division, ticked ones sent as `districts`. A district another zone has
	// shows that zone's name and can't be ticked here.
	let {
		districts,
		takenBy,
		value = $bindable([]),
		error
	}: {
		districts: District[];
		takenBy: Record<string, string>;
		value?: string[];
		error?: string;
	} = $props();

	const divisions = $derived(Map.groupBy(districts, (d) => d.division));
	const toggle = (name: string, on: boolean) =>
		(value = on ? [...value, name] : value.filter((v) => v !== name));
</script>

<fieldset class="picker">
	<legend>{t.districts}</legend>
	<p class="hint">{t.districtsHint}</p>
	<div class="tools">
		<Button
			variant="secondary"
			size="sm"
			onclick={() => (value = districts.filter((d) => !takenBy[d.name]).map((d) => d.name))}
			>{t.selectFree}</Button
		>
		<Button variant="ghost" size="sm" onclick={() => (value = [])}>{t.clear}</Button>
	</div>
	{#each divisions as [division, list] (division)}
		<div class="division">
			<p class="name">{division}</p>
			<div class="grid">
				{#each list as d (d.name)}
					<Checkbox
						name="districts"
						value={d.name}
						checked={value.includes(d.name)}
						disabled={!!takenBy[d.name]}
						hint={takenBy[d.name] ? t.inZone(takenBy[d.name]) : undefined}
						onchange={(e: Event) => toggle(d.name, (e.currentTarget as HTMLInputElement).checked)}
						>{d.name}</Checkbox
					>
				{/each}
			</div>
		</div>
	{/each}
	{#if error}<p class="error" role="alert">{error}</p>{/if}
</fieldset>

<style>
	.picker {
		display: grid;
		gap: 0.75rem;
		margin: 0;
		padding: 0;
		border: 0;
	}
	legend {
		padding: 0;
		font-weight: 500;
	}
	.hint {
		margin: 0;
		color: var(--ui-muted);
		font-size: 0.8125rem;
	}
	.tools {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}
	.division {
		padding: 0.75rem;
		border-radius: var(--ui-radius);
		background: var(--ui-subtle);
	}
	.name {
		margin: 0 0 0.5rem;
		font-size: 0.8125rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.03em;
	}
	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(9.5rem, 1fr));
		gap: 0.375rem 0.75rem;
	}
	.error {
		margin: 0;
		color: var(--ui-danger);
		font-size: 0.875rem;
	}
</style>
