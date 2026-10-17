<script lang="ts">
	import { ArrowRight01Icon, MoreHorizontalIcon } from '@hugeicons/core-free-icons';
	import type { Attachment } from 'svelte/attachments';
	import Icon from './Icon.svelte';
	import Tooltip from './Tooltip.svelte';
	import * as Dropdown from './dropdown/index';

	interface Crumb {
		label: string;
		href?: string;
	}

	interface Props {
		/** From the top level down; the last item is the current page and isn't a link. */
		items: Crumb[];
		/** Longer trails keep the first item and the last two, folding the rest into a "…" menu. */
		max?: number;
		label?: string;
	}

	let { items, max = 3, label = 'Breadcrumb' }: Props = $props();

	const collapsed = $derived(items.length > max);
	const hidden = $derived(collapsed ? items.slice(1, -2) : []);
	const shown = $derived(
		collapsed
			? [
					{ crumb: items[0], at: 0 },
					...items.slice(-2).map((crumb, i) => ({ crumb, at: items.length - 2 + i }))
				]
			: items.map((crumb, at) => ({ crumb, at }))
	);

	// Which names are cut short by their width limit: only those get a tooltip with the full name.
	let clipped = $state<Record<number, boolean>>({});
	const measure =
		(at: number): Attachment<HTMLElement> =>
		(el) => {
			const check = () => (clipped[at] = el.scrollWidth > el.clientWidth + 1);
			const ro = new ResizeObserver(check);
			ro.observe(el);
			check();
			return () => ro.disconnect();
		};
</script>

{#snippet sep()}<span class="sep" aria-hidden="true"
		><Icon icon={ArrowRight01Icon} size={14} /></span
	>{/snippet}

{#snippet name(crumb: Crumb, at: number, props: object = {})}
	{@const last = at === items.length - 1}
	{#if last || !crumb.href}
		<!-- Focusable only when cut short, so keyboard users can reach the tooltip too. -->
		<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
		<span
			class="current"
			aria-current={last ? 'page' : undefined}
			tabindex={clipped[at] ? 0 : undefined}
			{...props}
			{@attach measure(at)}>{crumb.label}</span
		>
	{:else}
		<a href={crumb.href} {...props} {@attach measure(at)}>{crumb.label}</a>
	{/if}
{/snippet}

<nav aria-label={label}>
	<ol>
		{#each shown as { crumb, at }, i (at)}
			<li>
				{#if i > 0}{@render sep()}{/if}
				{#if clipped[at]}
					<Tooltip text={crumb.label} labels>
						{#snippet trigger(props)}{@render name(crumb, at, props)}{/snippet}
					</Tooltip>
				{:else}
					{@render name(crumb, at)}
				{/if}
			</li>
			{#if i === 0 && collapsed}
				<li>
					{@render sep()}
					<Dropdown.Root>
						{#snippet trigger(props)}
							<button
								type="button"
								class="more"
								aria-label="Show {hidden.length} more {hidden.length === 1 ? 'level' : 'levels'}"
								{...props}><Icon icon={MoreHorizontalIcon} size={16} /></button
							>
						{/snippet}
						{#each hidden as crumb, i (i)}
							<Dropdown.Item href={crumb.href}>{crumb.label}</Dropdown.Item>
						{/each}
					</Dropdown.Root>
				</li>
			{/if}
		{/each}
	</ol>
</nav>

<style>
	ol {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.375rem;
		margin: 0;
		padding: 0;
		list-style: none;
		color: var(--ui-muted);
		font: 0.875rem/1.5 var(--ui-font);
	}
	li {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		min-inline-size: 0;
	}
	.sep {
		display: grid;
		flex: none;
		opacity: 0.7;
	}
	/* Points the reading direction. */
	.sep:dir(rtl) {
		transform: scaleX(-1);
	}
	/* Long names end in an ellipsis; the tooltip holds the rest. */
	a,
	.current {
		display: block;
		max-inline-size: 14rem;
		overflow: hidden;
		border-radius: calc(var(--ui-radius) - 0.25rem);
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	a {
		color: inherit;
		text-decoration: underline;
		text-decoration-color: transparent;
		text-underline-offset: 0.2em;
		transition:
			color var(--ui-dur) ease,
			text-decoration-color var(--ui-dur) ease;
	}
	@media (hover: hover) and (pointer: fine) {
		a:hover {
			color: var(--ui-fg);
			text-decoration-color: currentColor;
		}
	}
	:is(a, .current, .more):focus-visible {
		outline: var(--ui-ring-width) solid var(--ui-ring);
		outline-offset: var(--ui-ring-offset);
	}
	.current {
		color: var(--ui-fg);
		font-weight: 500;
	}
	.more {
		display: grid;
		place-items: center;
		inline-size: 1.75rem;
		block-size: 1.5rem;
		/* Hit area outgrows the icon; the negative margin keeps crumb spacing even. */
		margin: 0 -0.375rem;
		padding: 0;
		border: 1px solid transparent;
		border-radius: calc(var(--ui-radius) - 0.125rem);
		background: none;
		color: inherit;
		cursor: pointer;
		transition:
			background-color var(--ui-dur-press) ease,
			color var(--ui-dur) ease,
			transform var(--ui-dur-press) var(--ui-ease-out);
	}
	@media (hover: hover) and (pointer: fine) {
		.more:hover {
			background: var(--ui-subtle);
			color: var(--ui-fg);
		}
	}
	.more:active {
		transform: scale(0.94);
	}
	.more[aria-expanded='true'] {
		background: var(--ui-subtle);
		color: var(--ui-fg);
	}
	@media (pointer: coarse) {
		.more {
			inline-size: 2.75rem;
			block-size: 2.75rem;
			margin: -0.625rem -0.875rem;
		}
	}
</style>
