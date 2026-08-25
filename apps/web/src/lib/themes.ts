// A theme is configuration, never a fork (plan §7). These tokens become CSS custom properties
// on :root; every storefront component styles through them.
export type Theme = {
	name: string;
	fontDisplay: string;
	fontBody: string;
	/** Density drives spacing scale: airy for fashion, compact for tech. */
	density: 'airy' | 'compact';
	radius: string;
	gridCols: { base: number; sm: number; lg: number };
	/** Tall cards flatter garments; square cards fit spec-driven products. */
	cardAspect: string;
	headerStyle: 'minimal' | 'mega';
	colors: {
		bg: string;
		surface: string;
		text: string;
		muted: string;
		line: string;
		accent: string;
		accentText: string;
		sale: string;
	};
};

export const fashion: Theme = {
	name: 'fashion',
	fontDisplay: "'Georgia', 'Times New Roman', serif",
	fontBody: "'Inter', ui-sans-serif, system-ui, sans-serif",
	density: 'airy',
	radius: '0.25rem',
	gridCols: { base: 2, sm: 2, lg: 3 },
	cardAspect: '3 / 4',
	headerStyle: 'minimal',
	colors: {
		bg: '#fbfaf8',
		surface: '#ffffff',
		text: '#1a1a1a',
		muted: '#6b6560',
		line: '#e6e1da',
		accent: '#8a3324',
		accentText: '#ffffff',
		sale: '#8a3324'
	}
};

export const tech: Theme = {
	name: 'tech',
	// No display serif: a spec-driven store wants one neutral face everywhere,
	// and numbers are what the customer is actually comparing.
	fontDisplay: "'Mona Sans Variable', 'Inter', ui-sans-serif, system-ui, sans-serif",
	fontBody: "'Mona Sans Variable', 'Inter', ui-sans-serif, system-ui, sans-serif",
	density: 'compact',
	radius: '0.5rem',
	gridCols: { base: 2, sm: 3, lg: 5 },
	cardAspect: '1 / 1',
	headerStyle: 'mega',
	colors: {
		bg: '#f4f6f8',
		surface: '#ffffff',
		text: '#0f172a',
		muted: '#64748b',
		line: '#e2e8f0',
		accent: '#1d4ed8',
		accentText: '#ffffff',
		sale: '#dc2626'
	}
};

// South Asia: saturated warm palette, dense grid, everything on one screen.
// Merchants here compete with Daraz, where scanning beats navigating.
export const bazar: Theme = {
	name: 'bazar',
	// Hind Siliguri is drawn for Bengali UI and covers Latin, so a Bangla product
	// title and its English price render in one voice instead of two.
	fontDisplay: "'Hind Siliguri', 'Mona Sans Variable', ui-sans-serif, system-ui, sans-serif",
	fontBody: "'Hind Siliguri', 'Mona Sans Variable', ui-sans-serif, system-ui, sans-serif",
	density: 'compact',
	radius: '0.375rem',
	gridCols: { base: 2, sm: 3, lg: 5 },
	cardAspect: '1 / 1',
	headerStyle: 'mega',
	colors: {
		bg: '#fdf7f2',
		surface: '#ffffff',
		text: '#1c1410',
		muted: '#6f6259',
		line: '#eadfd4',
		// The orange every marketplace in the region trained shoppers on.
		accent: '#d94f10',
		accentText: '#ffffff',
		sale: '#c62828'
	}
};

// The Gulf: higher basket, more space, deep green and gold rather than a
// discount orange. Reads as a boutique, not a bazaar.
export const gulf: Theme = {
	name: 'gulf',
	// Cairo is the modern Arabic UI face the Gulf actually reads, and it carries
	// Latin too — so Arabic and English sit together without a fallback seam.
	fontDisplay: "'Cairo Variable', 'Mona Sans Variable', ui-sans-serif, system-ui, sans-serif",
	fontBody: "'Cairo Variable', 'Mona Sans Variable', ui-sans-serif, system-ui, sans-serif",
	density: 'airy',
	radius: '0.75rem',
	gridCols: { base: 2, sm: 3, lg: 4 },
	cardAspect: '4 / 5',
	headerStyle: 'minimal',
	colors: {
		bg: '#fbfaf7',
		surface: '#ffffff',
		text: '#14201b',
		muted: '#6c7a72',
		line: '#e4e6e0',
		accent: '#0f5132',
		accentText: '#ffffff',
		sale: '#9a6a1f'
	}
};

export const themes = { fashion, tech, bazar, gulf } as const;
export type ThemeName = keyof typeof themes;

export const getTheme = (name: string | null | undefined): Theme =>
	themes[(name ?? 'fashion') as ThemeName] ?? fashion;

/** Serialised into a :root block, so the whole page including <body> inherits it. */
export function themeCss(t: Theme): string {
	const airy = t.density === 'airy';
	const gap = airy ? '2rem' : '1rem';
	// Tech listings put price and stock right under the image; fashion lets the
	// picture breathe. One token, every component follows.
	const cardPad = airy ? '0.75rem' : '0.5rem';
	const titleSize = airy ? '1rem' : '0.875rem';
	// Arabic runs about 25% longer than the same English, so the Gulf theme
	// buys back the room in leading rather than shrinking the type.
	const leading = t.name === 'gulf' ? '1.75' : '1.55';
	return `:root{
--leading-body:${leading};
--font-display:${t.fontDisplay};
--font-body:${t.fontBody};
--radius:${t.radius};
--grid-gap:${gap};
--card-aspect:${t.cardAspect};
--card-pad:${cardPad};
--card-title:${titleSize};
--cols-base:${t.gridCols.base};
--cols-sm:${t.gridCols.sm};
--cols-lg:${t.gridCols.lg};
--c-bg:${t.colors.bg};
--c-surface:${t.colors.surface};
--c-text:${t.colors.text};
--c-muted:${t.colors.muted};
--c-line:${t.colors.line};
--c-accent:${t.colors.accent};
--c-accent-text:${t.colors.accentText};
--c-sale:${t.colors.sale};
}`;
}
