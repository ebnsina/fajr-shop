<script lang="ts">
	import { pop, reflow } from './motion';
	import { Cancel01Icon, CloudUploadIcon, File02Icon } from '@hugeicons/core-free-icons';
	import { announce } from './announce';
	import Icon from './Icon.svelte';
	import Morph from './Morph.svelte';

	interface Props {
		label: string;
		/** Chosen files; the hidden file input holds the same, so forms submit them. */
		value?: File[];
		/** Like the input's accept: '.pdf,image/*'. */
		accept?: string;
		multiple?: boolean;
		/** Largest size allowed, in bytes. */
		maxSize?: number;
		maxFiles?: number;
		hint?: string;
		name?: string;
		disabled?: boolean;
		locale?: string;
		/** Hand accepted files straight on (to an upload queue) instead of listing them here. */
		onfiles?: (files: File[]) => void;
	}

	let {
		label,
		value = $bindable([]),
		accept,
		multiple = false,
		maxSize,
		maxFiles,
		hint,
		name,
		disabled = false,
		locale = 'en',
		onfiles
	}: Props = $props();

	const id = $props.id();
	let input: HTMLInputElement;
	let over = $state(false);
	// What's held over the zone, judged by type before it's dropped (names aren't known until then).
	let incoming = $state<{ count: number; refused: boolean }>({ count: 0, refused: false });
	let depth = 0; // dragenter/leave fire for every child; count them so the zone doesn't flicker
	let problems = $state<string[]>([]);

	const size = (bytes: number) => {
		const [n, unit] =
			bytes >= 1e6
				? [bytes / 1e6, 'megabyte']
				: bytes >= 1e3
					? [bytes / 1e3, 'kilobyte']
					: [bytes, 'byte'];
		return new Intl.NumberFormat(locale, { style: 'unit', unit, maximumFractionDigits: 1 }).format(
			n
		);
	};
	const matches = (name: string | undefined, type: string) =>
		!accept ||
		accept.split(',').some((rule) => {
			const r = rule.trim().toLowerCase();
			// An extension rule can't be judged from a type alone: while dragging, give it the benefit.
			if (r.startsWith('.')) return name === undefined || name.toLowerCase().endsWith(r);
			if (r.endsWith('/*')) return type.startsWith(r.slice(0, -1));
			return type === r;
		});
	const accepted = (f: File) => matches(f.name, f.type);
	function judge(dt: DataTransfer) {
		const items = [...dt.items].filter((i) => i.kind === 'file');
		const room = maxFiles ? maxFiles - (multiple ? value.length : 0) : Infinity;
		incoming = {
			count: items.length,
			refused:
				items.some((i) => !matches(undefined, i.type)) ||
				(!multiple && items.length > 1) ||
				items.length > room
		};
	}
	const dropText = $derived(
		incoming.refused
			? !multiple && incoming.count > 1
				? 'One file at a time'
				: maxFiles && incoming.count > maxFiles - value.length
					? `Room for ${Math.max(0, maxFiles - value.length)} more`
					: 'Not a file type this takes'
			: `Drop to add ${incoming.count > 1 ? `${incoming.count} files` : 'it'}`
	);

	// Previews for images, freed when the file leaves the list.
	// eslint-disable-next-line svelte/prefer-svelte-reactivity -- a URL cache, never read reactively
	const previews = new Map<File, string>();
	const preview = (f: File) => {
		if (!f.type.startsWith('image/')) return undefined;
		if (!previews.has(f)) previews.set(f, URL.createObjectURL(f));
		return previews.get(f);
	};
	$effect(() => {
		for (const [f, url] of previews)
			if (!value.includes(f)) {
				previews.delete(f);
				// After the row's exit animation: released now, its picture would vanish mid-fade.
				setTimeout(() => URL.revokeObjectURL(url), 400);
			}
	});
	$effect(() => () => previews.forEach((url) => URL.revokeObjectURL(url)));

	/** Keeps the real input's files in step with the list, so a plain form submit sends them. */
	function sync() {
		const dt = new DataTransfer();
		value.forEach((f) => dt.items.add(f));
		input.files = dt.files;
	}

	function add(files: FileList | File[]) {
		const next = multiple ? [...value] : [];
		const turnedAway: string[] = [];
		for (const f of files) {
			if (!accepted(f)) turnedAway.push(`${f.name} isn't a file type this takes.`);
			else if (maxSize && f.size > maxSize)
				turnedAway.push(`${f.name} is ${size(f.size)}; the limit is ${size(maxSize)}.`);
			else if (maxFiles && next.length >= maxFiles)
				turnedAway.push(`${f.name} wasn't added: ${maxFiles} files at most.`);
			else if (!next.some((g) => g.name === f.name && g.size === f.size)) next.push(f);
			if (!multiple && next.length) break;
		}
		if (onfiles) {
			// Handed on, not kept: the new ones are what's new since the last list.
			const fresh = next.filter((f) => !value.includes(f));
			problems = turnedAway;
			if (fresh.length) onfiles(fresh);
			if (turnedAway.length) announce(turnedAway.join(' '));
			return;
		}
		const added = next.length - (multiple ? value.length : 0);
		value = next;
		problems = turnedAway;
		sync();
		announce(
			[added > 0 && `${added} ${added === 1 ? 'file' : 'files'} added.`, ...turnedAway]
				.filter(Boolean)
				.join(' ')
		);
	}

	function remove(f: File) {
		value = value.filter((g) => g !== f);
		sync();
		announce(`${f.name} removed.`);
	}
</script>

<div class="field">
	<span id="{id}-label" class="label">{label}</span>
	<!-- The drop target is for pointers; the button inside is the keyboard and screen-reader way in. -->
	<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
	<div
		class={['zone', over && 'over', over && incoming.refused && 'refused', disabled && 'disabled']}
		role="group"
		aria-labelledby="{id}-label"
		onclick={(e) => {
			// Anywhere on the zone opens the file picker, as the link inside does.
			if (!disabled && !(e.target as Element).closest('label, input')) input.click();
		}}
		onpaste={(e) => {
			const files = [...(e.clipboardData?.files ?? [])];
			if (!disabled && files.length) {
				e.preventDefault();
				add(files);
			}
		}}
		ondragenter={(e) => {
			if (disabled || !e.dataTransfer?.types.includes('Files')) return;
			e.preventDefault();
			if (!depth) judge(e.dataTransfer);
			depth++;
			over = true;
		}}
		ondragover={(e) => {
			if (!disabled && e.dataTransfer?.types.includes('Files')) e.preventDefault();
		}}
		ondragleave={() => {
			depth = Math.max(0, depth - 1);
			if (!depth) over = false;
		}}
		ondrop={(e) => {
			e.preventDefault();
			depth = 0;
			over = false;
			if (!disabled && e.dataTransfer?.files.length) add(e.dataTransfer.files);
		}}
	>
		<span class="icon"><Icon icon={CloudUploadIcon} size={24} /></span>
		{#snippet prompt()}
			<!-- Touch screens can't drag files in: there it reads just "Choose files". -->
			<!-- eslint-disable-next-line svelte/no-useless-mustaches -- keeps the space the markup layout would drop -->
			<span class="drag">Drag {multiple ? 'files' : 'a file'} here, or{' '}</span><label
				class="choose"
				for="{id}-input">choose {multiple ? 'files' : 'a file'}</label
			>
		{/snippet}
		<!-- While files are held over it, the prompt says whether they'll be taken. -->
		<p class="lead">
			<Morph
				current={over ? 'drop' : 'idle'}
				states={[
					{ key: 'idle', label: prompt },
					{ key: 'drop', text: dropText }
				]}
			/>
		</p>
		{#if hint}<p id="{id}-hint" class="hint">{hint}</p>{/if}
		<input
			bind:this={input}
			id="{id}-input"
			class="sr-only"
			type="file"
			{name}
			{accept}
			{multiple}
			{disabled}
			aria-describedby={hint ? `${id}-hint` : undefined}
			onchange={(e) => {
				const files = [...(e.currentTarget.files ?? [])];
				if (files.length) add(files);
			}}
		/>
	</div>

	{#if problems.length}
		<ul class="problems">
			{#each problems as p (p)}<li>{p}</li>{/each}
		</ul>
	{/if}

	<!-- Always in the page, so the last file's exit plays too; hidden once it has no rows. -->
	<ul class="files" aria-label="Chosen files">
		{#each value as f (f)}
			{@const url = preview(f)}
			<li out:pop={{ start: 0.96, duration: 200 }} animate:reflow={{ duration: 250 }}>
				{#if url}
					<img src={url} alt="" class="thumb" />
				{:else}
					<span class="thumb doc"><Icon icon={File02Icon} size={18} /></span>
				{/if}
				<span class="meta">
					<span class="name">{f.name}</span>
					<span class="size">{size(f.size)}</span>
				</span>
				<button type="button" class="remove" aria-label="Remove {f.name}" onclick={() => remove(f)}>
					<Icon icon={Cancel01Icon} size={16} />
				</button>
			</li>
		{/each}
	</ul>
</div>

<style>
	.field {
		display: grid;
		gap: 0.5rem;
		font: 0.9375rem/1.5 var(--ui-font);
		color: var(--ui-fg);
	}
	.label {
		font-weight: 500;
	}
	/* A tinted well, no dashed border; dragging over deepens the tint and lifts the icon. */
	.zone {
		position: relative;
		cursor: pointer;
		display: grid;
		justify-items: center;
		gap: 0.25rem;
		padding: 1.75rem 1rem;
		border-radius: calc(var(--ui-radius) * 1.5);
		background: var(--ui-subtle);
		text-align: center;
		transition: background-color var(--ui-dur) ease;
	}
	.zone.over {
		background: color-mix(in srgb, var(--ui-accent) 14%, transparent);
	}
	@media (hover: hover) {
		.zone:not(.disabled):not(.over):hover {
			background: var(--ui-hover);
		}
	}
	/* Held over but won't be taken: the same well, in the danger color, before anything is dropped. */
	.zone.refused {
		background: color-mix(in srgb, var(--ui-danger) 10%, transparent);
		color: var(--ui-danger);
	}
	.zone.disabled {
		cursor: not-allowed;
	}
	.zone:has(input:focus-visible) {
		outline: var(--ui-ring-width) solid var(--ui-ring);
		outline-offset: var(--ui-ring-offset);
	}
	.zone.disabled {
		opacity: 0.55;
	}
	.icon {
		display: grid;
		color: var(--ui-muted);
		transition:
			transform var(--ui-dur-overlay) var(--ui-ease-out),
			color var(--ui-dur) ease;
	}
	/* Files held over it: the icon lifts and bobs gently, waiting for the drop. */
	.over .icon {
		color: var(--ui-accent);
		transform: translateY(-3px) scale(1.08);
		animation: bob 1.1s ease-in-out 250ms infinite alternate;
	}
	.refused .icon {
		color: var(--ui-danger);
		animation: none;
	}
	@keyframes bob {
		to {
			transform: translateY(-6px) scale(1.08);
		}
	}
	.lead,
	.hint {
		margin: 0;
	}
	.hint {
		color: var(--ui-muted);
		font-size: 0.8125rem;
	}
	.choose {
		border-radius: 2px;
		color: color-mix(in srgb, var(--ui-accent) 80%, var(--ui-fg));
		font-weight: 500;
		text-decoration: underline;
		text-underline-offset: 0.2em;
		cursor: pointer;
	}
	@media (pointer: coarse) {
		.drag {
			display: none;
		}
		.choose {
			display: inline-block;
		}
		.choose::first-letter {
			text-transform: uppercase;
		}
	}
	.disabled .choose {
		cursor: not-allowed;
	}
	.problems {
		margin: 0;
		padding-inline-start: 1.25rem;
		color: var(--ui-danger);
		font-size: 0.8125rem;
	}
	.files:not(:has(li)) {
		display: none;
	}
	.files {
		display: grid;
		gap: 0.375rem;
		margin: 0;
		padding: 0;
		list-style: none;
	}
	/* New files slide in; removed ones fade out. */
	.files li {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.5rem;
		border-radius: var(--ui-radius);
		background: var(--ui-subtle);
		transition:
			opacity var(--ui-dur-overlay) var(--ui-ease-out),
			translate var(--ui-dur-overlay) var(--ui-ease-out);
	}
	@starting-style {
		.files li {
			opacity: 0;
			translate: 0 -4px;
		}
	}
	.thumb {
		flex: none;
		inline-size: 2.5rem;
		block-size: 2.5rem;
		border-radius: calc(var(--ui-radius) - 0.125rem);
		object-fit: cover;
	}
	.doc {
		display: grid;
		place-items: center;
		background: var(--ui-surface);
		color: var(--ui-muted);
	}
	.meta {
		display: grid;
		flex: 1;
		min-inline-size: 0;
	}
	.name {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.size {
		color: var(--ui-muted);
		font-size: 0.8125rem;
		font-variant-numeric: tabular-nums;
	}
	.remove {
		display: grid;
		flex: none;
		place-items: center;
		inline-size: 2rem;
		block-size: 2rem;
		margin: 0;
		padding: 0;
		border: 1px solid transparent;
		border-radius: calc(var(--ui-radius) - 0.125rem);
		background: none;
		color: var(--ui-muted);
		cursor: pointer;
		transition:
			background-color var(--ui-dur-press) ease,
			color var(--ui-dur) ease,
			transform var(--ui-dur-press) var(--ui-ease-out);
	}
	@media (pointer: coarse) {
		.remove {
			inline-size: 2.75rem;
			block-size: 2.75rem;
		}
	}
	@media (hover: hover) and (pointer: fine) {
		.remove:hover {
			background: var(--ui-surface);
			color: var(--ui-fg);
		}
	}
	.remove:active {
		transform: scale(0.92);
	}
	.remove:focus-visible {
		outline: var(--ui-ring-width) solid var(--ui-ring);
		outline-offset: 0;
	}
	@media (prefers-reduced-motion: reduce) {
		.icon,
		.files li {
			transition: none;
		}
		.over .icon {
			transform: none;
			animation: none;
		}
	}
	.sr-only {
		position: absolute;
		inline-size: 1px;
		block-size: 1px;
		overflow: hidden;
		clip-path: inset(50%);
		white-space: nowrap;
	}
</style>
