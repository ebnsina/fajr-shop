import type { FieldKey } from '@fajr/core/import';

// The mappable fields, in the order the form shows them.
export const IMPORT_FIELDS: { key: FieldKey; label: string; required?: boolean }[] = [
	{ key: 'handle', label: 'Product handle / ID' },
	{ key: 'title', label: 'Title', required: true },
	{ key: 'description', label: 'Description' },
	{ key: 'summary', label: 'Short description' },
	{ key: 'category', label: 'Category' },
	{ key: 'brand', label: 'Brand' },
	{ key: 'sku', label: 'SKU' },
	{ key: 'price', label: 'Price', required: true },
	{ key: 'compareAt', label: 'Compare-at price' },
	{ key: 'cost', label: 'Cost price' },
	{ key: 'stock', label: 'Stock' },
	{ key: 'imageUrl', label: 'Image URL' },
	{ key: 'option1Name', label: 'Option 1 name' },
	{ key: 'option1Value', label: 'Option 1 value' },
	{ key: 'option2Name', label: 'Option 2 name' },
	{ key: 'option2Value', label: 'Option 2 value' },
	{ key: 'status', label: 'Status' }
];
