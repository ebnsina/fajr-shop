// Bengali numerals in the storefront, Western in admin. Intl does both — never hand-format, or
// you get a bug per locale.
export function formatMoney(minor: number, currency = 'BDT', locale = 'bn-BD'): string {
	return new Intl.NumberFormat(locale, {
		style: 'currency',
		currency,
		minimumFractionDigits: minor % 100 === 0 ? 0 : 2,
		maximumFractionDigits: 2
	}).format(minor / 100);
}
