/** CSS that applies the shop's brand color, keeping text on it readable. Empty when no color is set. */
export function accentCss(hex: string | null | undefined) {
	if (!hex || !/^#[0-9a-f]{6}$/i.test(hex)) return '';
	const [r, g, b] = [1, 3, 5].map((i) => {
		const c = parseInt(hex.slice(i, i + 2), 16) / 255;
		return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
	});
	const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
	// White text when it contrasts better than near-black (WCAG relative luminance).
	const on = (luminance + 0.05) / 0.05 < 1.05 / (luminance + 0.05) ? '#ffffff' : '#0b0f19';
	const dark = `color-mix(in oklab, ${hex} 60%, white)`;
	// html:root outranks the default color in app.css, whichever stylesheet loads last.
	return `html:root{--ui-accent:light-dark(${hex},${dark});--ui-on-accent:light-dark(${on},#0b0f19)}`;
}
