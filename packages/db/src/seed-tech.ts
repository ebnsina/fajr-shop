/** Dev-only: a small electronics catalog, so the tech theme has something real. */
import { createCategory, createProduct, replaceVariants, saveAttribute, setProductAttributes } from '@fajr/core/catalog';
import { db, sql } from './index.ts';

const catId = await createCategory({ name: 'Laptops' });

const RAM = await saveAttribute({ categoryId: catId, name: 'RAM', unit: 'GB', sort: 0 });
const CPU = await saveAttribute({ categoryId: catId, name: 'Processor', sort: 1 });
const STORAGE = await saveAttribute({ categoryId: catId, name: 'Storage', sort: 2 });
const SCREEN = await saveAttribute({ categoryId: catId, name: 'Screen', unit: 'inch', sort: 3, isFilterable: false });

const LAPTOPS: [string, number, string, string, string, string, number][] = [
	['Acer Aspire 3 A315', 5450000, '8', 'Core i5', '512GB SSD', '15.6', 6],
	['Asus VivoBook 15 X1504', 6290000, '16', 'Core i5', '512GB SSD', '15.6', 4],
	['HP Pavilion 14-dv', 7890000, '16', 'Core i7', '1TB SSD', '14', 3],
	['Lenovo IdeaPad Slim 3', 4990000, '8', 'Ryzen 5', '256GB SSD', '15.6', 8],
	['Dell Inspiron 15 3520', 5990000, '8', 'Core i5', '512GB SSD', '15.6', 5],
	['MacBook Air M2', 13500000, '16', 'Apple M2', '512GB SSD', '13.6', 2]
];

for (const [title, priceMinor, ram, cpu, storage, screen, stock] of LAPTOPS) {
	const id = await createProduct({
		title,
		summary: `${ram}GB RAM · ${cpu} · ${storage}`,
		status: 'active',
		categoryId: catId
	});
	await replaceVariants(id, [
		{ priceMinor, costMinor: Math.round(priceMinor * 0.88), stockOnHand: stock }
	]);
	await setProductAttributes(id, [
		{ attributeId: RAM, value: ram },
		{ attributeId: CPU, value: cpu },
		{ attributeId: STORAGE, value: storage },
		{ attributeId: SCREEN, value: screen }
	]);
}

console.log(`tech catalog ready: ${LAPTOPS.length} laptops with specs`);
await db.close();
