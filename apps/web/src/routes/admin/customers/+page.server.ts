import { listCustomers, segmentCounts, type Segment } from '@fajr/core/crm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const segment = (url.searchParams.get('segment') as Segment | null) ?? undefined;
	const search = url.searchParams.get('q') ?? '';

	const [rows, counts] = await Promise.all([
		listCustomers({ search, segment, limit: 100 }),
		segmentCounts()
	]);

	return { rows, counts, segment: segment ?? null, search };
};
