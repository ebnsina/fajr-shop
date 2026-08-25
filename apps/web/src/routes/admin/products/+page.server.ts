import { listProducts, categoryTree, type CategoryNode } from '@fajr/core/catalog';
import type { PageServerLoad } from './$types';

/** Flattened with indentation, so one <select> can show the whole tree. */
function flatten(nodes: CategoryNode[], depth = 0): { id: string; label: string }[] {
	return nodes.flatMap((n) => [
		{ id: n.id, label: `${'— '.repeat(depth)}${n.name}` },
		...flatten(n.children, depth + 1)
	]);
}

export const load: PageServerLoad = async ({ url }) => {
	const search = url.searchParams.get('q') ?? '';
	const status = url.searchParams.get('status') as 'draft' | 'active' | 'archived' | null;
	const categoryId = url.searchParams.get('category') ?? undefined;
	const page = Math.max(1, Number(url.searchParams.get('page') ?? 1));
	const perPage = 25;

	const [{ rows, total }, tree] = await Promise.all([
		listProducts({
			search,
			status: status ?? undefined,
			categoryId,
			includeDescendants: true,
			limit: perPage,
			offset: (page - 1) * perPage
		}),
		categoryTree()
	]);

	return { rows, total, page, perPage, search, status, categoryId, categories: flatten(tree) };
};
