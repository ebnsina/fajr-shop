import { z } from 'zod';
import { BD_DISTRICTS } from './bd.ts';

// Everything that differs by market, in one place. A Dubai shop must never see
// Bangladeshi districts, and a Dubai customer's phone must never be rejected.
export type CountryProfile = {
	code: string;
	name: string;
	region: 'south-asia' | 'middle-east';
	currency: string;
	locale: string;
	dialCode: string;
	// What the top-level address field is called here.
	areaLabel: string;
	// The second level, or null where one level is enough.
	subAreaLabel: string | null;
	// group → areas. A flat market uses one group.
	areas: Record<string, string[]>;
	// Local form a customer actually types, e.g. 01712345678 or 0501234567.
	phoneExample: string;
	// National significant number length, after the dial code.
	nsnLength: number[];
	// Gulf prices are shown tax-inclusive by law; South Asia mostly is not.
	taxInclusiveByDefault: boolean;
	taxRateBp: number;
	taxName: string;
	// What the "pay in advance by transfer" option is actually called here.
	// bKash means nothing in Dubai, and a bank transfer is unusual in Dhaka.
	manualPayLabel: string;
	manualPayHint: string;
	// Where the shop delivers, in the customer's words.
	deliversTo: string;
};

const AE_AREAS = {
	Emirates: ['Abu Dhabi', 'Dubai', 'Sharjah', 'Ajman', 'Umm Al Quwain', 'Ras Al Khaimah', 'Fujairah']
};

const SA_AREAS = {
	Regions: [
		'Riyadh', 'Makkah', 'Madinah', 'Eastern Province', 'Asir', 'Tabuk', 'Hail',
		'Northern Borders', 'Jazan', 'Najran', 'Al Bahah', 'Al Jouf', 'Qassim'
	]
};

const PK_AREAS = {
	Punjab: ['Lahore', 'Faisalabad', 'Rawalpindi', 'Multan', 'Gujranwala', 'Sialkot', 'Bahawalpur'],
	Sindh: ['Karachi', 'Hyderabad', 'Sukkur', 'Larkana', 'Mirpur Khas'],
	'Khyber Pakhtunkhwa': ['Peshawar', 'Mardan', 'Abbottabad', 'Swat', 'Kohat'],
	Balochistan: ['Quetta', 'Gwadar', 'Turbat', 'Khuzdar'],
	Islamabad: ['Islamabad']
};

export const COUNTRIES: Record<string, CountryProfile> = {
	BD: {
		code: 'BD', name: 'Bangladesh', region: 'south-asia',
		currency: 'BDT', locale: 'bn', dialCode: '880',
		areaLabel: 'District', subAreaLabel: 'Area or thana',
		areas: BD_DISTRICTS,
		phoneExample: '01712345678', nsnLength: [10],
		taxInclusiveByDefault: false, taxRateBp: 0, taxName: 'VAT',
		manualPayLabel: 'bKash',
		manualPayHint: 'Send the amount to our bKash number and enter the transaction ID.',
		deliversTo: 'across Bangladesh'
	},
	PK: {
		code: 'PK', name: 'Pakistan', region: 'south-asia',
		currency: 'PKR', locale: 'ur', dialCode: '92',
		areaLabel: 'City', subAreaLabel: 'Area',
		areas: PK_AREAS,
		phoneExample: '03001234567', nsnLength: [10],
		taxInclusiveByDefault: false, taxRateBp: 0, taxName: 'GST',
		manualPayLabel: 'JazzCash',
		manualPayHint: 'Send the amount to our JazzCash number and enter the transaction ID.',
		deliversTo: 'across Pakistan'
	},
	AE: {
		code: 'AE', name: 'United Arab Emirates', region: 'middle-east',
		currency: 'AED', locale: 'en', dialCode: '971',
		areaLabel: 'Emirate', subAreaLabel: 'Area',
		areas: AE_AREAS,
		phoneExample: '0501234567', nsnLength: [9],
		taxInclusiveByDefault: true, taxRateBp: 500, taxName: 'VAT',
		manualPayLabel: 'Bank transfer',
		manualPayHint: 'Transfer the amount to our account and enter the reference.',
		deliversTo: 'across the Emirates'
	},
	SA: {
		code: 'SA', name: 'Saudi Arabia', region: 'middle-east',
		currency: 'SAR', locale: 'ar', dialCode: '966',
		areaLabel: 'Region', subAreaLabel: 'City',
		areas: SA_AREAS,
		phoneExample: '0501234567', nsnLength: [9],
		taxInclusiveByDefault: true, taxRateBp: 1500, taxName: 'VAT',
		manualPayLabel: 'Bank transfer',
		manualPayHint: 'Transfer the amount to our account and enter the reference.',
		deliversTo: 'across Saudi Arabia'
	},
	KW: {
		code: 'KW', name: 'Kuwait', region: 'middle-east',
		currency: 'KWD', locale: 'ar', dialCode: '965',
		areaLabel: 'Governorate', subAreaLabel: 'Area',
		areas: { Governorates: ['Al Asimah', 'Hawalli', 'Farwaniya', 'Mubarak Al-Kabeer', 'Ahmadi', 'Jahra'] },
		phoneExample: '51234567', nsnLength: [8],
		taxInclusiveByDefault: false, taxRateBp: 0, taxName: 'VAT',
		manualPayLabel: 'Bank transfer',
		manualPayHint: 'Transfer the amount to our account and enter the reference.',
		deliversTo: 'across Kuwait'
	},
	QA: {
		code: 'QA', name: 'Qatar', region: 'middle-east',
		currency: 'QAR', locale: 'ar', dialCode: '974',
		areaLabel: 'Municipality', subAreaLabel: 'Area',
		areas: { Municipalities: ['Doha', 'Al Rayyan', 'Al Wakrah', 'Al Khor', 'Umm Salal', 'Al Daayen', 'Al Shamal'] },
		phoneExample: '33123456', nsnLength: [8],
		taxInclusiveByDefault: false, taxRateBp: 0, taxName: 'VAT',
		manualPayLabel: 'Bank transfer',
		manualPayHint: 'Transfer the amount to our account and enter the reference.',
		deliversTo: 'across Qatar'
	},
	BH: {
		code: 'BH', name: 'Bahrain', region: 'middle-east',
		currency: 'BHD', locale: 'ar', dialCode: '973',
		areaLabel: 'Governorate', subAreaLabel: 'Area',
		areas: { Governorates: ['Capital', 'Muharraq', 'Northern', 'Southern'] },
		phoneExample: '36123456', nsnLength: [8],
		taxInclusiveByDefault: true, taxRateBp: 1000, taxName: 'VAT',
		manualPayLabel: 'Bank transfer',
		manualPayHint: 'Transfer the amount to our account and enter the reference.',
		deliversTo: 'across Bahrain'
	},
	OM: {
		code: 'OM', name: 'Oman', region: 'middle-east',
		currency: 'OMR', locale: 'ar', dialCode: '968',
		areaLabel: 'Governorate', subAreaLabel: 'Wilayat',
		areas: { Governorates: ['Muscat', 'Dhofar', 'Musandam', 'Al Buraimi', 'Al Dakhiliyah', 'Al Batinah North', 'Al Batinah South', 'Al Sharqiyah North', 'Al Sharqiyah South', 'Al Dhahirah', 'Al Wusta'] },
		phoneExample: '92123456', nsnLength: [8],
		taxInclusiveByDefault: true, taxRateBp: 500, taxName: 'VAT',
		manualPayLabel: 'Bank transfer',
		manualPayHint: 'Transfer the amount to our account and enter the reference.',
		deliversTo: 'across Oman'
	}
};

export const countryOf = (code: string | null | undefined): CountryProfile =>
	COUNTRIES[(code ?? 'BD').toUpperCase()] ?? COUNTRIES.BD!;

// Flat list for a picker, ignoring the grouping.
export const areasOf = (code: string | null | undefined): string[] =>
	Object.values(countryOf(code).areas).flat();

// One phone schema per country, normalising whatever the customer types into
// E.164. Without this a Dubai customer cannot complete checkout at all.
export function phoneFor(code: string | null | undefined) {
	const country = countryOf(code);
	const { dialCode, nsnLength } = country;

	return z
		.string()
		.trim()
		.transform((raw) => {
			let digits = raw.replace(/\D/g, '');
			if (digits.startsWith(dialCode)) digits = digits.slice(dialCode.length);
			// A local number is written with a leading zero almost everywhere.
			if (digits.startsWith('0')) digits = digits.slice(1);
			return `+${dialCode}${digits}`;
		})
		.pipe(
			z.string().refine(
				(value) => nsnLength.includes(value.length - dialCode.length - 1),
				`Enter a valid ${country.name} mobile number, e.g. ${country.phoneExample}`
			)
		);
}
