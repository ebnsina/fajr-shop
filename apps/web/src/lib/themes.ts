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

export const themes = { fashion, tech } as const;
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
	return `:root{
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
