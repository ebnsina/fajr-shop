<script lang="ts">
	// Typeahead over a long list. A UAE shop has seven emirates and a Dhaka shop
	// has forty-two thanas — scrolling a native select past forty options on a
	// phone is what this replaces.
	let {
		id,
		label,
		value = $bindable(''),
		options,
		placeholder = 'Type to search…',
		required = false,
		disabled = false,
		error = '',
		hint = '',
		name
	}: {
		id: string;
		label: string;
		value?: string;
		options: string[];
		placeholder?: string;
		required?: boolean;
		disabled?: boolean;
		error?: string;
		hint?: string;
		name: string;
	} = $props();

	let query = $state('');
	let open = $state(false);
	let active = $state(-1);
	let root: HTMLDivElement;

	// The input shows the chosen value until the customer starts typing again.
	const display = $derived(open ? query : value);

	const matches = $derived(
		(open && query.trim()
			? options.filter((o) => o.toLowerCase().includes(query.trim().toLowerCase()))
			: options
		).slice(0, 50)
	);

	// A changed option list means the old value no longer belongs to it — this
	// is what clears the thana when the district changes.
	$effect(() => {
		if (value && options.length && !options.includes(value)) value = '';
	});

	function choose(option: string) {
		value = option;
		query = '';
		open = false;
		active = -1;
	}

	function onKey(event: KeyboardEvent) {
		if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
			event.preventDefault();
			open = true;
			const step = event.key === 'ArrowDown' ? 1 : -1;
			active = (active + step + matches.length) % Math.max(matches.length, 1);
			return;
		}
		if (event.key === 'Enter' && open && active >= 0 && matches[active]) {
			event.preventDefault();
			choose(matches[active]);
			return;
		}
		if (event.key === 'Escape') {
			open = false;
			active = -1;
		}
	}

	// Clicking away commits nothing: a half-typed query must not become a value.
	function onBlur(event: FocusEvent) {
		const next = event.relatedTarget as Node | null;
		if (next && root?.contains(next)) return;
		open = false;
		query = '';
		active = -1;
	}
</script>

<div class="combo" bind:this={root} onfocusout={onBlur}>
	<label for={id}>{label}</label>

	<!-- The real value. The visible input is only a search box, so a mis-typed
	     query can never be submitted as an address. -->
	<input type="hidden" {name} {value} />

	<div class="field-wrap">
		<input
			{id}
			type="text"
			role="combobox"
			autocomplete="off"
			aria-expanded={open}
			aria-controls="{id}-list"
			aria-autocomplete="list"
			aria-activedescendant={active >= 0 && matches[active] ? `${id}-opt-${active}` : undefined}
			aria-invalid={error ? 'true' : undefined}
			aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
			{disabled}
			{required}
			placeholder={value || placeholder}
			value={display}
			oninput={(e) => {
				query = e.currentTarget.value;
				open = true;
				active = -1;
			}}
			onfocus={() => (open = true)}
			onkeydown={onKey}
		/>

		{#if value && !disabled}
			<button type="button" class="clear" onclick={() => choose('')} aria-label="Clear {label}">
				×
			</button>
		{/if}
	</div>

	{#if open && matches.length}
		<ul class="list" id="{id}-list" role="listbox" aria-label={label}>
			{#each matches as option, i (option)}
				<li
					id="{id}-opt-{i}"
					role="option"
					aria-selected={option === value}
					class:active={i === active}
					onmousedown={(e) => {
						e.preventDefault();
						choose(option);
					}}
				>
					{option}
				</li>
			{/each}
		</ul>
	{:else if open && query.trim()}
		<p class="empty">Nothing matches “{query}”.</p>
	{/if}

	{#if error}
		<em id="{id}-error" role="alert">{error}</em>
	{:else if hint}
		<small id="{id}-hint">{hint}</small>
	{/if}
</div>

<style>
	.combo {
		position: relative;
		display: block;
	}
	.field-wrap {
		position: relative;
	}
	.clear {
		position: absolute;
		inset-inline-end: 0.5rem;
		inset-block-start: 50%;
		transform: translateY(-50%);
		inline-size: 1.75rem;
		block-size: 1.75rem;
		border: 0;
		border-radius: 50%;
		background: transparent;
		color: var(--c-muted);
		font-size: 1.25rem;
		line-height: 1;
		cursor: pointer;
	}
	.clear:hover {
		background: var(--c-bg);
		color: var(--c-text);
	}

	.list {
		position: absolute;
		z-index: 20;
		inset-inline: 0;
		inset-block-start: calc(100% + 0.25rem);
		max-block-size: 15rem;
		overflow-y: auto;
		margin: 0;
		padding: 0.25rem;
		list-style: none;
		background: var(--c-surface);
		border: 1px solid var(--c-line);
		border-radius: var(--radius);
		box-shadow: 0 8px 24px rgb(0 0 0 / 0.08);
	}
	.list li {
		padding: 0.5rem 0.625rem;
		border-radius: calc(var(--radius) - 2px);
		cursor: pointer;
		font-size: 0.9375rem;
	}
	.list li.active,
	.list li:hover {
		background: var(--c-bg);
	}
	.list li[aria-selected='true'] {
		font-weight: 600;
	}
	.empty {
		position: absolute;
		z-index: 20;
		inset-inline: 0;
		inset-block-start: calc(100% + 0.25rem);
		margin: 0;
		padding: 0.75rem;
		font-size: 0.875rem;
		color: var(--c-muted);
		background: var(--c-surface);
		border: 1px solid var(--c-line);
		border-radius: var(--radius);
	}
</style>
