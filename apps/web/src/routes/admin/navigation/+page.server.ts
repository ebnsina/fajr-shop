import { fail } from '@sveltejs/kit';
import { menuFor, bannersFor } from '@fajr/core/cms';
import { list as listMedia } from '@fajr/core/media';
import { db, menuItem, banner, newId, eq, asc } from '@fajr/db';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const [items, banners, media] = await Promise.all([
		db.read.select().from(menuItem).where(eq(menuItem.menu, 'main')).orderBy(asc(menuItem.sort)),
		db.read.select().from(banner).orderBy(asc(banner.slot), asc(banner.sort)),
		listMedia({ limit: 60 })
	]);
	return { items, banners, media };
};

export const actions: Actions = {
	addLink: async ({ request }) => {
		const form = await request.formData();
		const label = String(form.get('label') ?? '').trim();
		const href = String(form.get('href') ?? '').trim();
		if (!label || !href) return fail(400, { error: 'A menu item needs a label and a link.' });

		const [last] = await db.read
			.select({ sort: menuItem.sort })
			.from(menuItem)
			.where(eq(menuItem.menu, 'main'))
			.orderBy(asc(menuItem.sort));

		await db.write.insert(menuItem).values({
			id: newId('mnu'),
			menu: 'main',
			label,
			href,
			sort: (last?.sort ?? -1) + 1
		});
		return { done: true };
	},

	updateLink: async ({ request }) => {
		const form = await request.formData();
		await db.write
			.update(menuItem)
			.set({
				label: String(form.get('label') ?? '').trim(),
				href: String(form.get('href') ?? '').trim(),
				sort: Number(form.get('sort') ?? 0),
				updatedAt: new Date()
			})
			.where(eq(menuItem.id, String(form.get('id'))));
		return { done: true };
	},

	removeLink: async ({ request }) => {
		const form = await request.formData();
		await db.write.delete(menuItem).where(eq(menuItem.id, String(form.get('id'))));
		return { done: true };
	},

	saveBanner: async ({ request }) => {
		const form = await request.formData();
		const id = String(form.get('id') ?? '');
		const starts = String(form.get('startsAt') ?? '');
		const ends = String(form.get('endsAt') ?? '');

		const values = {
			name: String(form.get('name') ?? '').trim(),
			slot: String(form.get('slot') ?? 'home-top').trim(),
			mediaId: String(form.get('mediaId') ?? '') || null,
			href: String(form.get('href') ?? '') || null,
			alt: String(form.get('alt') ?? '') || null,
			// A schedule is the whole point: banners go up and come down on their own.
			startsAt: starts ? new Date(starts) : null,
			endsAt: ends ? new Date(ends) : null,
			isActive: form.get('isActive') === 'on',
			updatedAt: new Date()
		};

		if (!values.name) return fail(400, { error: 'Give the banner a name.' });

		if (id) await db.write.update(banner).set(values).where(eq(banner.id, id));
		else await db.write.insert(banner).values({ id: newId('bnr'), ...values });

		return { done: true };
	},

	removeBanner: async ({ request }) => {
		const form = await request.formData();
		await db.write.delete(banner).where(eq(banner.id, String(form.get('id'))));
		return { done: true };
	}
};
