<script lang="ts">
	import { ease, pop, reflow } from './motion';
	import { Cancel01Icon } from '@hugeicons/core-free-icons';
	import { announce } from './announce';
	import Icon from './Icon.svelte';

	interface Props {
		label: string;
		value?: string[];
		placeholder?: string;
		hint?: string;
		error?: string;
		/** Form field name: each tag is submitted as its own value under it. */
		name?: string;
		max?: number;
		disabled?: boolean;
	}

	let {
		label,
		value = $bindable([]),
		placeholder = 'Type and press Enter',
		hint,
		error,
		name,
		max,
		disabled = false
	}: Props = $props();

	const id = $props.id();
	let input: HTMLInputElement;
	let list = $state<HTMLUListElement>();
	let text = $state('');
	// The one tag in the Tab order (roving): the last one moved to.
	let current = $state(0);
	const full = $derived(max !== undefined && value.length >= max);

	// Tags are found by value, never position: a removed tag stays in the page while it fades out.
	const tagOf = (tag: string) =>
		list?.querySelector<HTMLElement>(`[data-tag="${CSS.escape(tag)}"]`) ?? undefined;

	/** Adds each comma-separated part; an existing tag pulses instead of being added twice. */
	function add(raw: string) {
		const parts = raw
			.split(',')
			.map((p) => p.trim())
			.filter(Boolean);
		const added: string[] = [];
		for (const part of parts) {
			const at = value.findIndex((v) => v.toLocaleLowerCase() === part.toLocaleLowerCase());
			if (at >= 0) {
				tagOf(value[at])
					?.closest('li')
					?.animate(
						[{ transform: 'scale(1)' }, { transform: 'scale(1.08)' }, { transform: 'scale(1)' }],
						{ duration: 260, easing: ease.standard }
					);
				announce(`${value[at]} is already added.`);
				continue;
			}
			if (max !== undefined && value.length + added.length >= max) {
				announce(`${max} at most.`);
				break;
			}
			added.push(part);
		}
		if (added.length) {
			value = [...value, ...added];
			announce(`${added.join(', ')} added.`);
		}
		text = '';
	}

	function remove(i: number) {
		const [gone] = value.splice(i, 1);
		value = [...value];
		announce(`${gone} removed.`);
		// Focus the tag that took its place, the one before, or the text box when none are left.
		requestAnimationFrame(() => {
			const next = Math.min(i, value.length - 1);
			current = Math.max(0, next);
			const target = next >= 0 ? tagOf(value[next]) : null;
			(target ?? input).focus();
		});
	}

	function onTagKey(e: KeyboardEvent, i: number) {
		const rtl = getComputedStyle(e.currentTarget as Element).direction === 'rtl';
		const move = { ArrowLeft: rtl ? 1 : -1, ArrowRight: rtl ? -1 : 1 }[e.key];
		if (move !== undefined) {
			e.preventDefault();
			const to = i + move;
			if (to >= value.length) input.focus();
			else if (to >= 0) {
				current = to;
				tagOf(value[to])?.focus();
			}
		} else if (e.key === 'Backspace' || e.key === 'Delete') {
			e.preventDefault();
			remove(i);
		}
	}

	const describedby = $derived(
		[hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ') || undefined
	);
</script>

<div class="field">
	<label for="{id}-input">{label}</label>
	<!-- Clicking the box's empty space focuses the text field, as in a plain input. -->
	<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
	<div
		class={['control', error && 'invalid', disabled && 'disabled']}
		onclick={(e) => e.target === e.currentTarget && input.focus()}
	>
		<!-- Always in the page, so the last tag's exit plays too; hidden once it has none. -->
		<ul bind:this={list} class="tags" aria-label="{label}, {value.length} added">
			{#each value as tag, i (tag)}
				<li transition:pop={{ start: 0.85, duration: 180 }} animate:reflow={{ duration: 220 }}>
					<span class="text">{tag}</span>
					<!-- The tag's own control: removing it. Arrow keys move between tags. -->
					<button
						type="button"
						class="remove"
						aria-label="Remove {tag}"
						data-tag={tag}
						tabindex={i === current ? 0 : -1}
						{disabled}
						onclick={() => remove(i)}
						onkeydown={(e) => onTagKey(e, i)}
						onfocus={() => (current = i)}
					>
						<Icon icon={Cancel01Icon} size={12} strokeWidth={2} />
					</button>
				</li>
			{/each}
		</ul>
		<input
			bind:this={input}
			bind:value={text}
			id="{id}-input"
			type="text"
			autocomplete="off"
			enterkeyhint="done"
			placeholder={full ? '' : placeholder}
			aria-describedby={describedby}
			aria-invalid={error ? true : undefined}
			disabled={disabled || full}
			onkeydown={(e) => {
				if (e.isComposing) return;
				if (e.key === 'Enter' || e.key === ',') {
					if (!text.trim()) return;
					e.preventDefault();
					add(text);
				} else if (e.key === 'Backspace' && !text && value.length) {
					// Moves to the last tag first; a second Backspace removes it. Hard to delete by accident.
					e.preventDefault();
					current = value.length - 1;
					tagOf(value.at(-1)!)?.focus();
				}
			}}
			onpaste={(e) => {
				const pasted = e.clipboardData?.getData('text') ?? '';
				if (!pasted.includes(',')) return;
				e.preventDefault();
				add(text + pasted);
			}}
			onblur={() => text.trim() && add(text)}
		/>
	</div>
	{#if name}
		{#each value as tag (tag)}<input type="hidden" {name} value={tag} />{/each}
	{/if}
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
	}
	/* One box like Input; the tags wrap inside it before the text box. */
	.control {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.375rem;
		box-sizing: border-box;
		min-block-size: 2.5rem;
		padding: 0.3125rem 0.5rem;
		border: 1px solid var(--ui-field-line);
		/* Pill while it is one line; rounded, not stretched, once tags wrap. */
		border-radius: min(var(--ui-radius-control), 1.25rem);
		background: var(--ui-surface);
		cursor: text;
	}
	.control:has(input:focus-visible) {
		outline: var(--ui-ring-width) solid var(--ui-ring);
		outline-offset: var(--ui-ring-offset);
	}
	.invalid {
		border-color: var(--ui-danger);
	}
	.invalid:has(input:focus-visible) {
		outline-color: var(--ui-danger);
	}
	.disabled {
		background: var(--ui-subtle);
		opacity: 0.55;
	}
	.tags:not(:has(li)) {
		display: none;
	}
	.tags {
		display: flex;
		flex-wrap: wrap;
		gap: 0.375rem;
		max-inline-size: 100%;
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.tags li {
		display: inline-flex;
		align-items: center;
		gap: 0.125rem;
		max-inline-size: 100%;
		padding-inline: 0.5rem 0.125rem;
		border-radius: calc(var(--ui-radius-control) * 0.75);
		background: var(--ui-subtle);
		font-size: 0.875rem;
		line-height: 1.75rem;
	}
	.text {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.remove {
		display: grid;
		flex: none;
		place-items: center;
		inline-size: 1.375rem;
		block-size: 1.375rem;
		margin: 0;
		padding: 0;
		border: 1px solid transparent;
		border-radius: calc(var(--ui-radius-control) * 0.5);
		background: none;
		color: var(--ui-muted);
		cursor: pointer;
		transition:
			background-color var(--ui-dur-press) ease,
			color var(--ui-dur) ease;
	}
	/* The whole tag is the touch target on phones. */
	@media (pointer: coarse) {
		.remove {
			inline-size: 2rem;
			block-size: 2rem;
		}
	}
	@media (hover: hover) and (pointer: fine) {
		.remove:hover {
			background: var(--ui-hover);
			color: var(--ui-fg);
		}
	}
	.remove:focus-visible {
		outline: var(--ui-ring-width) solid var(--ui-ring);
		outline-offset: 0;
	}
	input {
		flex: 1;
		/* Room for the default placeholder, so it wraps below the tags instead of being cut off. */
		min-inline-size: min(100%, 10.5rem);
		margin: 0;
		padding: 0 0.25rem;
		border: 0;
		outline: none;
		background: none;
		color: inherit;
		font: inherit;
		font-size: max(1rem, 16px);
	}
	input::placeholder {
		color: var(--ui-muted);
		opacity: 1;
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
</style>
