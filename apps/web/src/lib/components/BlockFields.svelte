<script lang="ts">
	import type { BlockType } from '@fajr/schemas';

	// Fields are described per block type rather than generated from the Zod schema.
	type Field =
		| { key: string; label: string; kind: 'text' | 'textarea' | 'number' | 'datetime' | 'media'; hint?: string }
		| { key: string; label: string; kind: 'select'; options: { value: string; label: string }[] }
		| { key: string; label: string; kind: 'list'; of: { key: string; label: string; kind: 'text' | 'textarea' | 'media' }[] };

	const FIELDS: Record<BlockType, Field[]> = {
		hero: [
			{ key: 'heading', label: 'Heading', kind: 'text' },
			{ key: 'subheading', label: 'Subheading', kind: 'text' },
			{ key: 'mediaId', label: 'Background image', kind: 'media' },
			{ key: 'overlay', label: 'Image darkening %', kind: 'number', hint: 'Higher keeps text readable over a busy photo.' },
			{ key: 'align', label: 'Alignment', kind: 'select', options: [
				{ value: 'center', label: 'Centre' },
				{ value: 'start', label: 'Left' }
			] },
			{ key: 'cta.label', label: 'Button text', kind: 'text' },
			{ key: 'cta.href', label: 'Button link', kind: 'text' }
		],
		'rich-text': [
			{ key: 'heading', label: 'Heading', kind: 'text' },
			{ key: 'body', label: 'Text', kind: 'textarea' }
		],
		'product-grid': [
			{ key: 'heading', label: 'Heading', kind: 'text' },
			{ key: 'source', label: 'Show', kind: 'select', options: [
				{ value: 'newest', label: 'Newest products' },
				{ value: 'category', label: 'A category' },
				{ value: 'collection', label: 'A collection' }
			] },
			{ key: 'categorySlug', label: 'Category slug', kind: 'text' },
			{ key: 'collectionSlug', label: 'Collection slug', kind: 'text' },
			{ key: 'limit', label: 'How many', kind: 'number' }
		],
		'category-tiles': [{ key: 'heading', label: 'Heading', kind: 'text' }],
		countdown: [
			{ key: 'heading', label: 'Heading', kind: 'text' },
			{ key: 'endsAt', label: 'Ends at', kind: 'datetime' },
			{ key: 'subheading', label: 'Note', kind: 'text' }
		],
		'usp-bar': [
			{ key: 'items', label: 'Promises', kind: 'list', of: [
				{ key: 'title', label: 'Title', kind: 'text' },
				{ key: 'body', label: 'Detail', kind: 'text' }
			] }
		],
		faq: [
			{ key: 'heading', label: 'Heading', kind: 'text' },
			{ key: 'items', label: 'Questions', kind: 'list', of: [
				{ key: 'q', label: 'Question', kind: 'text' },
				{ key: 'a', label: 'Answer', kind: 'textarea' }
			] }
		],
		testimonials: [
			{ key: 'heading', label: 'Heading', kind: 'text' },
			{ key: 'items', label: 'Quotes', kind: 'list', of: [
				{ key: 'quote', label: 'Quote', kind: 'textarea' },
				{ key: 'name', label: 'Name', kind: 'text' },
				{ key: 'mediaId', label: 'Photo', kind: 'media' }
			] }
		],
		video: [
			{ key: 'heading', label: 'Heading', kind: 'text' },
			{ key: 'youtubeId', label: 'YouTube video ID', kind: 'text', hint: 'The part after v= in the URL.' },
			{ key: 'caption', label: 'Caption', kind: 'text' }
		],
		'cta-banner': [
			{ key: 'heading', label: 'Heading', kind: 'text' },
			{ key: 'body', label: 'Text', kind: 'text' },
			{ key: 'cta.label', label: 'Button text', kind: 'text' },
			{ key: 'cta.href', label: 'Button link', kind: 'text' },
			{ key: 'tone', label: 'Style', kind: 'select', options: [
				{ value: 'accent', label: 'Accent' },
				{ value: 'quiet', label: 'Quiet' }
			] }
		]
	};

	let {
		type,
		props = $bindable(),
		media
	}: { type: BlockType; props: Record<string, any>; media: { id: string; url: string; alt: string | null }[] } = $props();

	const fields = $derived(FIELDS[type] ?? []);

	/** Dotted keys so a nested value like cta.label needs no special case. */
	const get = (obj: any, path: string) => path.split('.').reduce((o, k) => o?.[k], obj);
	function set(path: string, value: unknown) {
		const keys = path.split('.');
		let target = props;
		for (const k of keys.slice(0, -1)) target = target[k] ??= {};
		target[keys.at(-1)!] = value;
		props = props;
	}

	function addItem(key: string, shape: { key: string }[]) {
		props[key] = [...(props[key] ?? []), Object.fromEntries(shape.map((s) => [s.key, '']))];
		props = props;
	}
	function removeItem(key: string, i: number) {
		props[key] = (props[key] ?? []).filter((_: unknown, n: number) => n !== i);
		props = props;
	}

	let pickerFor = $state<string | null>(null);
</script>

<div class="space-y-3">
	{#each fields as field (field.key)}
		<div>
			<span class="label">{field.label}</span>

			{#if field.kind === 'text'}
				<input class="field" value={get(props, field.key) ?? ''} oninput={(e) => set(field.key, e.currentTarget.value)} />
			{:else if field.kind === 'textarea'}
				<textarea class="field" rows="4" value={get(props, field.key) ?? ''} oninput={(e) => set(field.key, e.currentTarget.value)}></textarea>
			{:else if field.kind === 'number'}
				<input class="field" type="number" value={get(props, field.key) ?? 0} oninput={(e) => set(field.key, Number(e.currentTarget.value))} />
			{:else if field.kind === 'datetime'}
				<input
					class="field"
					type="datetime-local"
					value={get(props, field.key) ? new Date(get(props, field.key)).toISOString().slice(0, 16) : ''}
					oninput={(e) => set(field.key, e.currentTarget.value ? new Date(e.currentTarget.value).toISOString() : null)}
				/>
			{:else if field.kind === 'select'}
				<select class="field" value={get(props, field.key)} onchange={(e) => set(field.key, e.currentTarget.value)}>
					{#each field.options as o (o.value)}<option value={o.value}>{o.label}</option>{/each}
				</select>
			{:else if field.kind === 'media'}
				{@const current = media.find((m) => m.id === get(props, field.key))}
				<div class="flex items-center gap-2">
					{#if current}
						<img src={current.url} alt="" class="size-12 rounded-xl object-cover" />
					{/if}
					<button type="button" class="btn btn-secondary !py-1 !text-xs" onclick={() => (pickerFor = pickerFor === field.key ? null : field.key)}>
						{current ? 'Change' : 'Choose image'}
					</button>
					{#if current}
						<button type="button" class="btn btn-ghost !py-1 !text-xs" onclick={() => set(field.key, null)}>Remove</button>
					{/if}
				</div>
				{#if pickerFor === field.key}
					<ul class="mt-2 grid max-h-48 grid-cols-5 gap-1.5 overflow-y-auto rounded-xl bg-hover p-1.5">
						{#each media as m (m.id)}
							<li>
								<button type="button" class="block w-full overflow-hidden rounded-lg" onclick={() => { set(field.key, m.id); pickerFor = null; }}>
									<img src={m.url} alt={m.alt ?? ''} class="aspect-square w-full object-cover" />
								</button>
							</li>
						{/each}
					</ul>
				{/if}
			{:else if field.kind === 'list'}
				<div class="space-y-2">
					{#each (props[field.key] ?? []) as item, i (i)}
						<div class="space-y-1.5 rounded-xl bg-hover p-2.5">
							{#each field.of as sub (sub.key)}
								{#if sub.kind === 'textarea'}
									<textarea class="field !text-xs" rows="2" placeholder={sub.label} value={item[sub.key] ?? ''} oninput={(e) => { item[sub.key] = e.currentTarget.value; props = props; }}></textarea>
								{:else if sub.kind === 'media'}
									<select class="field !text-xs" value={item[sub.key] ?? ''} onchange={(e) => { item[sub.key] = e.currentTarget.value || null; props = props; }}>
										<option value="">No photo</option>
										{#each media as m (m.id)}<option value={m.id}>{m.alt ?? m.id}</option>{/each}
									</select>
								{:else}
									<input class="field !text-xs" placeholder={sub.label} value={item[sub.key] ?? ''} oninput={(e) => { item[sub.key] = e.currentTarget.value; props = props; }} />
								{/if}
							{/each}
							<button type="button" class="btn btn-ghost !py-0.5 !text-xs hover:!text-red-600" onclick={() => removeItem(field.key, i)}>Remove</button>
						</div>
					{/each}
					<button type="button" class="btn btn-secondary !py-1 !text-xs" onclick={() => addItem(field.key, field.of)}>Add</button>
				</div>
			{/if}

			{#if 'hint' in field && field.hint}
				<p class="hint mt-1">{field.hint}</p>
			{/if}
		</div>
	{/each}
</div>
