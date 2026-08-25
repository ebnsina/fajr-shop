<script lang="ts">
	import { enhance } from '$app/forms';

	let { data, form } = $props();
	let uploading = $state(false);

	const kb = (bytes: number) =>
		bytes < 1024 * 1024 ? `${Math.round(bytes / 1024)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
</script>

<svelte:head><title>Media · Fajr Shop</title></svelte:head>

<div class="flex items-center justify-between gap-4">
	<div>
		<h1 class="text-xl font-semibold tracking-tight">Media</h1>
		<p class="mt-1 text-sm text-muted">{data.items.length} images</p>
	</div>

	<form
		method="POST"
		action="?/upload"
		enctype="multipart/form-data"
		use:enhance={() => {
			uploading = true;
			return async ({ update }) => {
				await update();
				uploading = false;
			};
		}}
	>
		<label
			class="inline-flex cursor-pointer items-center btn btn-primary"
		>
			{uploading ? 'Uploading…' : 'Upload images'}
			<input
				type="file"
				name="files"
				accept="image/*"
				multiple
				class="sr-only"
				disabled={uploading}
				onchange={(e) => e.currentTarget.form?.requestSubmit()}
			/>
		</label>
	</form>
</div>

{#if form?.error}
	<p class="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{form.error}</p>
{/if}

{#if data.items.length === 0}
	<p class="mt-10 rounded-3xl border border-dashed border-line/60 p-10 text-center text-sm text-muted">
		No images yet. Upload one to get started.
	</p>
{:else}
	<ul class="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
		{#each data.items as item (item.id)}
			<li class="overflow-hidden rounded-xl bg-raised elevated">
				<img
					src={item.url}
					alt={item.alt ?? ''}
					width={item.width ?? undefined}
					height={item.height ?? undefined}
					loading="lazy"
					class="aspect-square w-full bg-active object-cover"
				/>

				<div class="space-y-2 p-3">
					<p class="text-xs text-muted">
						{item.width}×{item.height} · {kb(item.sizeBytes)}
					</p>

					<form method="POST" action="?/alt" use:enhance>
						<input type="hidden" name="id" value={item.id} />
						<input
							name="alt"
							value={item.alt ?? ''}
							placeholder="Alt text"
							onblur={(e) => e.currentTarget.form?.requestSubmit()}
							class="field !px-2 !py-1 !text-xs"
						/>
					</form>

					<form method="POST" action="?/delete" use:enhance>
						<input type="hidden" name="id" value={item.id} />
						<button class="text-xs text-muted transition hover:text-red-600">Delete</button>
					</form>
				</div>
			</li>
		{/each}
	</ul>
{/if}
