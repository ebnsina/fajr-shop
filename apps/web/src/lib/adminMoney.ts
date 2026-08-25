import { page } from '$app/state';

// The shop's own currency, from the admin layout. Every admin screen used to
// print ৳ regardless, so a Dubai merchant read their revenue in taka.
export function adminMoney(minor: number): string {
	return new Intl.NumberFormat(page.data.numberLocale ?? 'en-BD', {
		style: 'currency',
		currency: page.data.currency ?? 'BDT',
		minimumFractionDigits: minor % 100 === 0 ? 0 : 2,
		maximumFractionDigits: 2
	}).format(minor / 100);
}
