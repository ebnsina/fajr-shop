import { error } from '@sveltejs/kit';
import { getOrder } from '@fajr/core/orders';
import { db, setting, eq } from '@fajr/db';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const [detail, store] = await Promise.all([
		getOrder(params.id),
		db.read.query.setting.findFirst({ where: eq(setting.id, 'default') })
	]);
	if (!detail) error(404, 'Order not found');

	return {
		order: detail,
		store: {
			name: store?.storeName ?? 'Fajr Shop',
			phone: store?.supportPhone ?? null,
			// VAT is per-merchant, not a constant — most BD shops are not registered, and an
			// unregistered one must not print a Mushak form.
			vatRegistered: store?.vatRegistered ?? false,
			vatBin: store?.vatBin ?? null
		}
	};
};
