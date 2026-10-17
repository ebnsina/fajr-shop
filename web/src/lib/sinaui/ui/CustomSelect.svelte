<script lang="ts" module>
	export interface Option<V extends string = string> {
		value: V;
		label: string;
		/** Secondary line under the label. */
		description?: string;
		disabled?: boolean;
	}
</script>

<script lang="ts" generics="T extends string">
	import type { Snippet } from 'svelte';
	import { tick } from 'svelte';
	import { Search01Icon, Tick02Icon, UnfoldMoreIcon } from '@hugeicons/core-free-icons';
	import Icon from './Icon.svelte';
	import { announce, isApple } from './announce';
	import { anchored } from './floating';
	import { glide } from './glide';
	import { scrollEdges } from './scroll-edges';

	interface Props {
		/** What the choice is about. Visible by default; hideLabel keeps it for screen readers only. */
		label: string;
		hideLabel?: boolean;
		options: Option<T>[];
		value?: T | '';
		placeholder?: string;
		hint?: string;
		error?: string;
		/** Form field name: a hidden native select carries the value, so forms, autofill and required work. */
		name?: string;
		required?: boolean;
		disabled?: boolean;
		/** Custom rendering for each option (icons, avatars). Gets the option and whether it's selected. */
		item?: Snippet<[Option<T>, boolean]>;
		/** A search box at the top of the list, for long lists. */
		searchable?: boolean;
		/** Names the search box. */
		searchLabel?: string;
		/** Shown when the search matches nothing. */
		empty?: string;
		/** Called after a different option is chosen, with its value (to submit a filter, say). */
		onchange?: (value: T) => void;
		class?: string;
	}

	let {
		label,
		hideLabel = false,
		options,
		value = $bindable(''),
		placeholder = 'Choose…',
		hint,
		error,
		name,
		required = false,
		disabled = false,
		item,
		searchable = false,
		searchLabel = 'Search',
		empty = 'No matches',
		onchange,
		class: className
	}: Props = $props();

	const id = $props.id();
	let button: HTMLButtonElement;
	let popup: HTMLDivElement;
	let list: HTMLDivElement;
	let search = $state<HTMLInputElement>();
	let query = $state('');
	let highlight: HTMLSpanElement;
	// Pointer moves glide the highlight; keyboard moves snap it.
	let viaPointer = false;
	let open = $state(false);
	let active = $state(-1);

	const selected = $derived(options.find((o) => o.value === value));
	// Accent- and case-insensitive, so "cordoba" finds Córdoba.
	const fold = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
	const visible = $derived(
		new Set(
			options
				.map((_, i) => i)
				.filter((i) => {
					// Names and descriptions both count: "cordoba" finds everyone who worked there.
					const q = fold(query.trim());
					const o = options[i];
					return !searchable || !q || fold(`${o.label} ${o.description ?? ''}`).includes(q);
				})
		)
	);
	const enabled = $derived([...visible].filter((i) => !options[i].disabled));
	const optionId = (i: number) => `${id}-opt-${i}`;
	const describedby = $derived(
		[hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ') || undefined
	);

	const float = anchored(
		() => button,
		() => popup,
		() => (open = false)
	);
	$effect(() => {
		if (!open) {
			// Closing from the search box: back to the button, not lost to the page.
			if (popup.contains(document.activeElement)) button.focus();
			float.close();
			return;
		}
		// At least as wide as the trigger, so the list reads as the control's own.
		popup.style.minInlineSize = `${button.offsetWidth}px`;
		float.open();
		if (searchable) tick().then(() => search?.focus());
	});
	$effect(() => () => float.destroy());

	// The highlight follows the active option; hidden while closed so it never slides in from a stale spot.
	$effect(() => {
		const item =
			open && active >= 0
				? list.querySelector<HTMLElement>(`#${CSS.escape(optionId(active))}`)
				: null;
		glide(highlight, item, viaPointer);
	});

	// Keep the highlighted option in view inside the list.
	$effect(() => {
		if (open && active >= 0)
			list.querySelector(`#${CSS.escape(optionId(active))}`)?.scrollIntoView({ block: 'nearest' });
	});

	// VoiceOver ignores aria-activedescendant, so on Apple devices the highlighted option is spoken.
	$effect(() => {
		const o = options[active];
		if (open && o && isApple()) announce(o.label);
	});

	function show(at: number) {
		query = '';
		active = at;
		open = true;
	}
	function choose(i: number) {
		if (!options[i] || options[i].disabled) return;
		const changed = options[i].value !== value;
		value = options[i].value;
		if (isApple()) announce(`${options[i].label}, selected`);
		open = false;
		if (changed) onchange?.(options[i].value);
	}
	/** Moves the highlight among enabled options, clamped at the ends (as native selects do). */
	function step(by: number) {
		if (!enabled.length) return;
		const pos = enabled.indexOf(active);
		const next = pos === -1 ? (by > 0 ? 0 : enabled.length - 1) : pos + by;
		active = enabled[Math.max(0, Math.min(enabled.length - 1, next))];
	}

	// Typeahead: letters typed within half a second build one search, so "sam" reaches Samarkand.
	let typed = '';
	let typedAt = 0;
	function typeahead(key: string) {
		const now = performance.now();
		typed = now - typedAt > 500 ? key : typed + key;
		typedAt = now;
		const q = typed.toLowerCase();
		const start = enabled.indexOf(active);
		// A single repeated letter cycles through matches; a longer search stays on the current match.
		const from = q.length === 1 ? start + 1 : Math.max(start, 0);
		const order = [...enabled.slice(from), ...enabled.slice(0, from)];
		const hit = order.find((i) => options[i].label.toLowerCase().startsWith(q));
		if (hit !== undefined) {
			if (!open) show(hit);
			else active = hit;
		}
	}

	function onkeydown(e: KeyboardEvent) {
		viaPointer = false;
		// In the search box, Home/End, Space and letters edit the text instead.
		const inSearch = e.currentTarget === search;
		const current = selected ? options.indexOf(selected) : -1;
		if (!open) {
			if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
				e.preventDefault();
				show(current >= 0 ? current : e.key === 'ArrowUp' ? enabled.at(-1)! : enabled[0]);
			} else if (e.key === 'Home' || e.key === 'End') {
				e.preventDefault();
				show(e.key === 'Home' ? enabled[0] : enabled.at(-1)!);
			} else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
				typeahead(e.key);
			}
			return;
		}
		switch (e.key) {
			case 'ArrowDown':
				e.preventDefault();
				step(1);
				break;
			case 'ArrowUp':
				e.preventDefault();
				if (e.altKey) choose(active);
				else step(-1);
				break;
			case 'PageDown':
				e.preventDefault();
				step(10);
				break;
			case 'PageUp':
				e.preventDefault();
				step(-10);
				break;
			case 'Home':
				if (inSearch) break;
				e.preventDefault();
				active = enabled[0];
				break;
			case 'End':
				if (inSearch) break;
				e.preventDefault();
				active = enabled.at(-1)!;
				break;
			case 'Enter':
				e.preventDefault();
				choose(active);
				break;
			case ' ':
				if (inSearch) break;
				e.preventDefault();
				// Mid-search, Space is part of the text ("al jabr"); otherwise it chooses.
				if (performance.now() - typedAt < 500) typeahead(' ');
				else choose(active);
				break;
			case 'Escape':
				e.preventDefault();
				open = false;
				break;
			case 'Tab':
				// Tab picks the highlighted option and moves on, like a native select.
				choose(active);
				break;
			default:
				if (!inSearch && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey)
					typeahead(e.key);
		}
	}
</script>

<div class={['field', className]}>
	<!-- Focus only: a label click would otherwise also click (open) the button. -->
	<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
	<label
		id="{id}-label"
		for="{id}-button"
		class:sr-only={hideLabel}
		onclick={(e) => (e.preventDefault(), button.focus())}
	>
		{label}
	</label>
	<button
		bind:this={button}
		type="button"
		id="{id}-button"
		role="combobox"
		aria-labelledby="{id}-label"
		aria-haspopup="listbox"
		aria-expanded={open}
		aria-controls="{id}-list"
		aria-activedescendant={open && active >= 0 ? optionId(active) : undefined}
		aria-invalid={error ? true : undefined}
		aria-describedby={describedby}
		{disabled}
		class={['trigger', !selected && 'placeholder']}
		onclick={() =>
			open ? (open = false) : show(selected ? options.indexOf(selected) : enabled[0])}
		{onkeydown}
		onblur={(e) => {
			// Focus left for good (not into the list): close without changing anything.
			if (!popup.contains(e.relatedTarget as Node | null)) open = false;
		}}
	>
		<span class="value">{selected?.label ?? placeholder}</span>
		<span class="chev" aria-hidden="true"><Icon icon={UnfoldMoreIcon} size={16} /></span>
	</button>
	{#if name}
		<!-- React Aria's HiddenSelect: a real field for forms, autofill and required, out of sight. -->
		<select
			class="sr-only"
			tabindex="-1"
			aria-hidden="true"
			{name}
			{required}
			{disabled}
			bind:value
			onfocus={() => button.focus()}
		>
			<option value=""></option>
			{#each options as o (o.value)}<option value={o.value}>{o.label}</option>{/each}
		</select>
	{/if}

	<!-- The popup: an optional search box above the list. Presses inside never take focus from the
	     button (or the search box), except in the search box itself. -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		bind:this={popup}
		popover="manual"
		class="popup"
		onpointerdown={(e) => e.target !== search && e.preventDefault()}
	>
		{#if searchable}
			<div class="search">
				<Icon icon={Search01Icon} size={16} />
				<input
					bind:this={search}
					type="text"
					role="combobox"
					aria-label={searchLabel}
					aria-autocomplete="list"
					aria-expanded={open}
					aria-controls="{id}-list"
					aria-activedescendant={open && active >= 0 ? optionId(active) : undefined}
					autocomplete="off"
					spellcheck="false"
					value={query}
					oninput={(e) => {
						query = e.currentTarget.value;
						active = enabled[0] ?? -1;
					}}
					{onkeydown}
					onblur={(e) => {
						const to = e.relatedTarget as Node | null;
						if (!popup.contains(to) && to !== button) open = false;
					}}
				/>
			</div>
		{/if}
		<!-- Focus never enters the list: the combobox keeps it and points at the highlighted option.
		     No tabindex, and presses anywhere inside (scrollbar too) are kept from taking focus. -->
		<div
			bind:this={list}
			id="{id}-list"
			role="listbox"
			aria-labelledby="{id}-label"
			{@attach scrollEdges}
			data-fade-over
			class="list"
		>
			<span class="highlight" aria-hidden="true" bind:this={highlight}></span>
			{#each options as o, i (o.value)}
				{@const isSelected = o.value === value}
				{#if visible.has(i)}
					<!-- svelte-ignore a11y_click_events_have_key_events -->
					<div
						id={optionId(i)}
						role="option"
						tabindex="-1"
						aria-selected={isSelected}
						aria-disabled={o.disabled || undefined}
						class={['option', i === active && 'active']}
						onpointermove={() => {
							viaPointer = true;
							if (!o.disabled) active = i;
						}}
						onclick={() => choose(i)}
					>
						<span class="text">
							{#if item}{@render item(o, isSelected)}{:else}
								<span class="label">{o.label}</span>
								{#if o.description}<span class="description">{o.description}</span>{/if}
							{/if}
						</span>
						<span class="tick" aria-hidden="true">
							{#if isSelected}<Icon icon={Tick02Icon} size={16} />{/if}
						</span>
					</div>
				{/if}
			{/each}
		</div>

		{#if searchable && query.trim() && !enabled.length}<p class="none">{empty}</p>{/if}
		{#if searchable}<span class="sr-only" role="status"
				>{query.trim()
					? `${enabled.length} ${enabled.length === 1 ? 'result' : 'results'}`
					: ''}</span
			>{/if}
	</div>

	{#if hint}<p id="{id}-hint" class="hint">{hint}</p>{/if}
	{#if error}<p id="{id}-error" class="error">{error}</p>{/if}
</div>

<style>
	.field {
		display: grid;
		gap: 0.25rem;
		font: 0.9375rem/1.5 var(--ui-font);
		color: var(--ui-fg);
	}
	label {
		font-weight: 500;
		cursor: default;
	}
	/* Same box as Input and the native Select. */
	.trigger {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		box-sizing: border-box;
		inline-size: 100%;
		min-block-size: 2.5rem;
		margin: 0;
		padding: 0.375rem 0.75rem;
		border: 1px solid var(--ui-field-line);
		border-radius: var(--ui-radius-control);
		background: var(--ui-surface);
		color: inherit;
		font: inherit;
		font-size: max(1rem, 16px);
		text-align: start;
		cursor: pointer;
	}
	@media (pointer: coarse) {
		.trigger {
			min-block-size: 2.75rem;
		}
	}
	.trigger:focus-visible {
		outline: var(--ui-ring-width) solid var(--ui-ring);
		outline-offset: var(--ui-ring-offset);
	}
	.trigger[aria-invalid='true'] {
		border-color: var(--ui-danger);
	}
	.trigger[aria-invalid='true']:focus-visible {
		outline-color: var(--ui-danger);
	}
	.trigger:disabled {
		background: var(--ui-subtle);
		opacity: 0.55;
		cursor: not-allowed;
	}
	.value {
		flex: 1;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.placeholder .value {
		color: var(--ui-muted);
	}
	.chev {
		display: grid;
		color: var(--ui-muted);
	}

	.popup {
		position: fixed;
		inset: auto;
		flex-direction: column;
		margin: 0;
		box-sizing: border-box;
		max-block-size: min(20rem, calc(100dvh - 16px));
		padding: 0;
		overflow: hidden;
		/* Invisible normally; outlines the list in Windows High Contrast. */
		border: 1px solid transparent;
		border-radius: var(--ui-radius);
		background: var(--ui-surface-overlay);
		color: var(--ui-fg);
		font: 0.9375rem/1.4 var(--ui-font);
		box-shadow: var(--ui-shadow-overlay);
	}
	.popup:popover-open {
		display: flex;
	}
	/* Nothing matched: no empty list box above the message. */
	.list:not(:has([role='option'])) {
		display: none;
	}
	.list {
		position: relative;
		flex: 1;
		min-block-size: 0;
		overflow: auto;
		overscroll-behavior: contain;
		padding: 0.25rem;
	}
	.search {
		display: flex;
		flex: none;
		align-items: center;
		gap: 0.5rem;
		margin: 0.375rem 0.375rem 0;
		padding: 0 0.625rem;
		border-radius: calc(var(--ui-radius) - 0.125rem);
		background: var(--ui-subtle);
		color: var(--ui-muted);
	}
	.search:focus-within {
		outline: var(--ui-ring-width) solid var(--ui-ring);
		outline-offset: -2px;
	}
	.search input {
		flex: 1;
		min-inline-size: 0;
		block-size: 2.25rem;
		margin: 0;
		padding: 0;
		border: 0;
		outline: none;
		background: none;
		color: var(--ui-fg);
		font: inherit;
		/* 16px minimum: iOS Safari zooms into smaller inputs. */
		font-size: max(1rem, 16px);
	}
	.none {
		margin: 0;
		padding: 1rem 0.75rem 1.25rem;
		color: var(--ui-muted);
		font-size: 0.875rem;
		text-align: center;
	}
	.option {
		display: flex;
		box-sizing: border-box;
		align-items: center;
		gap: 0.75rem;
		min-block-size: 2.25rem;
		padding: 0.375rem 0.625rem;
		border-radius: calc(var(--ui-radius) - 0.25rem);
		cursor: pointer;
	}
	@media (pointer: coarse) {
		.option {
			min-block-size: 2.75rem;
		}
	}
	/* One highlight glides between options (see glide.ts); options stay transparent above it. */
	.highlight {
		position: absolute;
		top: 0;
		left: 0;
		transform-origin: 0 0;
		border-radius: calc(var(--ui-radius) - 0.25rem);
		background: var(--ui-subtle);
		opacity: 0;
		pointer-events: none;
		transition: opacity 120ms ease;
	}
	.option {
		position: relative;
	}
	.option[aria-disabled='true'] {
		opacity: 0.55;
		cursor: not-allowed;
	}
	.text {
		display: grid;
		flex: 1;
		min-inline-size: 0;
	}
	.description {
		color: var(--ui-muted);
		font-size: 0.8125rem;
	}
	.tick {
		display: grid;
		flex: none;
		inline-size: 1rem;
		color: var(--ui-accent);
	}
	.hint,
	.error {
		margin: 0;
		font-size: 0.8125rem;
	}
	.hint {
		color: var(--ui-muted);
	}
	.error {
		color: var(--ui-danger);
	}
	.sr-only {
		position: absolute;
		inline-size: 1px;
		block-size: 1px;
		overflow: hidden;
		clip-path: inset(50%);
		white-space: nowrap;
	}
	@media (forced-colors: active) {
		.option.active {
			outline: 2px solid Highlight;
		}
	}
</style>
