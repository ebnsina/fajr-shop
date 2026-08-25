// Shopify and WooCommerce exports are CSVs with known column names, so the feature is one
// mapper with their layouts pre-filled — not three importers.
export type FieldKey =
	| 'handle' | 'title' | 'description' | 'summary' | 'category' | 'brand'
	| 'sku' | 'price' | 'compareAt' | 'cost' | 'stock' | 'imageUrl'
	| 'option1Name' | 'option1Value' | 'option2Name' | 'option2Value' | 'status';

export type Mapping = Partial<Record<FieldKey, string>>;

export type Preset = {
	id: string;
	label: string;
	mapping: Mapping;
	/** Shopify repeats the handle across variant and image rows. */
	groupBy: FieldKey;
	detect: (headers: string[]) => boolean;
};

export const PRESETS: Preset[] = [
	{
		id: 'shopify',
		label: 'Shopify',
		groupBy: 'handle',
		mapping: {
			handle: 'Handle',
			title: 'Title',
			description: 'Body (HTML)',
			category: 'Product Category',
			brand: 'Vendor',
			sku: 'Variant SKU',
			price: 'Variant Price',
			compareAt: 'Variant Compare At Price',
			cost: 'Cost per item',
			stock: 'Variant Inventory Qty',
			imageUrl: 'Image Src',
			option1Name: 'Option1 Name',
			option1Value: 'Option1 Value',
			option2Name: 'Option2 Name',
			option2Value: 'Option2 Value',
			status: 'Status'
		},
		detect: (h) => h.includes('Handle') && h.includes('Variant Price')
	},
	{
		id: 'woocommerce',
		label: 'WooCommerce',
		groupBy: 'handle',
		mapping: {
			handle: 'SKU',
			title: 'Name',
			description: 'Description',
			summary: 'Short description',
			category: 'Categories',
			sku: 'SKU',
			price: 'Regular price',
			compareAt: 'Sale price',
			stock: 'Stock',
			imageUrl: 'Images',
			status: 'Published'
		},
		detect: (h) => h.includes('Regular price') && h.includes('Name')
	}
];

/** Best-guess preset from the header row, so the merchant usually confirms rather than maps. */
export function detectPreset(headers: string[]): Preset | null {
	return PRESETS.find((p) => p.detect(headers)) ?? null;
}
