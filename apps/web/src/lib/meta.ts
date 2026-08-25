// What a route contributes to the head. The storefront layout renders it, so
// exactly one og:title exists no matter how many routes are nested.
export type PageMeta = {
	title: string;
	description?: string;
	type?: 'website' | 'product' | 'article';
	image?: string | null;
	noindex?: boolean;
};

// Titles read "Page · Shop", except the shop's own front page.
export const titled = (storeName: string, part?: string | null): string =>
	part ? `${part} · ${storeName}` : storeName;
