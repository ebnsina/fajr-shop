// Never hand-format money. Intl knows that bn-BD wants Bengali numerals and
// en-AE wants Western ones; a hardcoded locale gets one market wrong forever.
export function formatMoney(minor: number, currency: string, locale: string): string {
	return new Intl.NumberFormat(locale, {
		style: 'currency',
		currency,
		minimumFractionDigits: minor % 100 === 0 ? 0 : 2,
		maximumFractionDigits: 2
	}).format(minor / 100);
}

export type MoneyStore = { currency: string; locale: string };

// Bound to the store once, so a call site cannot forget the locale and silently
// print dirhams in Bengali digits.
export const moneyFor = (store: MoneyStore) => (minor: number) =>
	formatMoney(minor, store.currency, store.locale);
