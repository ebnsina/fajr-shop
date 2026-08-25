import type { OptionInput, VariantFormInput } from '@fajr/schemas';

/** Stable identity for a combination: "Red / XL". Order follows the options. */
export const comboKey = (values: string[]) => values.join(' / ');

// Cartesian product of the option values.
export function buildMatrix(
	options: OptionInput[],
	existing: VariantFormInput[]
): VariantFormInput[] {
	const usable = options.filter((o) => o.name.trim() && o.values.some((v) => v.value.trim()));

	if (usable.length === 0) {
		// No options: one variant, and it keeps whatever was already entered.
		const base = existing[0];
		return [
			{
				id: base?.id,
				key: '',
				sku: base?.sku ?? null,
				price: base?.price ?? 0,
				compareAt: base?.compareAt ?? null,
				cost: base?.cost ?? null,
				stockOnHand: base?.stockOnHand ?? 0,
				allowBackorder: base?.allowBackorder ?? false,
				isActive: base?.isActive ?? true
			}
		];
	}

	let combos: string[][] = [[]];
	for (const option of usable) {
		const values = option.values.map((v) => v.value.trim()).filter(Boolean);
		combos = combos.flatMap((combo) => values.map((value) => [...combo, value]));
	}

	const byKey = new Map(existing.map((v) => [v.key, v]));
	const fallback = existing[0];

	return combos.map((combo) => {
		const key = comboKey(combo);
		const prior = byKey.get(key);
		return {
			id: prior?.id,
			key,
			sku: prior?.sku ?? null,
			// A brand-new row inherits the first variant's price — filling 12 rows
			// with the same number by hand is how merchants learn to hate software.
			price: prior?.price ?? fallback?.price ?? 0,
			compareAt: prior?.compareAt ?? null,
			cost: prior?.cost ?? fallback?.cost ?? null,
			stockOnHand: prior?.stockOnHand ?? 0,
			allowBackorder: prior?.allowBackorder ?? false,
			isActive: prior?.isActive ?? true
		};
	});
}
