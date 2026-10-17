// Prices travel in poisha (1/100 taka); people see and type taka.
const whole = new Intl.NumberFormat('en-BD', {
	style: 'currency',
	currency: 'BDT',
	currencyDisplay: 'narrowSymbol',
	maximumFractionDigits: 0
});
const cents = new Intl.NumberFormat('en-BD', {
	style: 'currency',
	currency: 'BDT',
	currencyDisplay: 'narrowSymbol',
	minimumFractionDigits: 2
});

/** "৳2,500" or "৳2,500.50" from poisha. */
export function formatMoney(poisha: number) {
	return (poisha % 100 === 0 ? whole : cents).format(poisha / 100);
}

/** "৳250 – ৳300", or one price when they match. */
export function formatRange(min: number, max: number) {
	return min === max ? formatMoney(min) : `${formatMoney(min)} – ${formatMoney(max)}`;
}

export const toPoisha = (taka: number) => Math.round(taka * 100);
export const toTaka = (poisha: number) => poisha / 100;
