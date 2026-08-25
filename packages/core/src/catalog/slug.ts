// Slugs keep unicode letters, so a Bangla title gets a Bangla slug rather than a meaningless
// id. Browsers percent-encode it and search engines handle it.
export function slugify(input: string): string {
	return input
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '') // Latin accents only; leaves other scripts intact
		.normalize('NFC')
		.toLowerCase()
		.replace(/['"’]/g, '')
		.replace(/[^\p{L}\p{N}\p{M}]+/gu, '-')
		.slice(0, 80)
		.replace(/^-+|-+$/g, '');
}

// Appends -2, -3 … until free. `taken` excludes the row being edited, so
// re-saving a product keeps its own slug.
export async function uniqueSlug(
	base: string,
	taken: (slug: string) => Promise<boolean>,
	fallback = 'item'
): Promise<string> {
	const root = slugify(base) || fallback;
	if (!(await taken(root))) return root;
	for (let n = 2; n < 1000; n++) {
		const candidate = `${root}-${n}`;
		if (!(await taken(candidate))) return candidate;
	}
	throw new Error(`could not find a free slug for "${base}"`);
}
