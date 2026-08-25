import { db, sql } from '@fajr/db';
import { enabledCouriers } from './couriers/index.ts';

export type CourierScore = {
	courier: string;
	delivered: number;
	returned: number;
	successRate: number;
	/** How specific the evidence was: the thana, the district, or nowhere. */
	basis: 'thana' | 'district' | 'global' | 'none';
};

// Not enough history to trust a rate. Below this a courier is judged on the next level up
// rather than on two lucky parcels.
const MIN_SAMPLE = 8;

/** Everyone starts equal; the prior is what a courier scores with no evidence. */
const PRIOR_SUCCESS = 0.85;
const PRIOR_WEIGHT = 5;

type Row = { courier: string; delivered: number | string; returned: number | string };

async function outcomes(where: ReturnType<typeof sql>): Promise<Map<string, { delivered: number; returned: number }>> {
	const rows = (await db.read.execute(sql`
		select courier,
		       count(*) filter (where status = 'delivered')      as delivered,
		       count(*) filter (where status in ('returned','lost')) as returned
		from shipment
		where ${where}
		group by courier
	`)) as unknown as Row[];

	return new Map(
		rows.map((r) => [r.courier, { delivered: Number(r.delivered), returned: Number(r.returned) }])
	);
}

// Rank couriers by how well they actually deliver to this address.
export async function rankCouriers(
	district: string | null | undefined,
	thana: string | null | undefined,
	available = enabledCouriers()
): Promise<CourierScore[]> {
	const [byThana, byDistrict, global] = await Promise.all([
		thana && district
			? outcomes(sql`district = ${district} and thana = ${thana}`)
			: Promise.resolve(new Map()),
		district ? outcomes(sql`district = ${district}`) : Promise.resolve(new Map()),
		outcomes(sql`true`)
	]);

	return available
		.map((courier): CourierScore => {
			const t = byThana.get(courier);
			const d = byDistrict.get(courier);
			const g = global.get(courier);

			const pick =
				t && t.delivered + t.returned >= MIN_SAMPLE
					? { stats: t, basis: 'thana' as const }
					: d && d.delivered + d.returned >= MIN_SAMPLE
						? { stats: d, basis: 'district' as const }
						: g && g.delivered + g.returned > 0
							? { stats: g, basis: 'global' as const }
							: { stats: { delivered: 0, returned: 0 }, basis: 'none' as const };

			const n = pick.stats.delivered + pick.stats.returned;
			const successRate =
				(pick.stats.delivered + PRIOR_SUCCESS * PRIOR_WEIGHT) / (n + PRIOR_WEIGHT);

			return { courier, ...pick.stats, successRate, basis: pick.basis };
		})
		.sort((a, b) => b.successRate - a.successRate || a.courier.localeCompare(b.courier));
}

/** The courier to use, unless a human overrides it on the order. */
export async function chooseCourier(
	district: string | null | undefined,
	thana: string | null | undefined
): Promise<CourierScore | null> {
	const ranked = await rankCouriers(district, thana);
	return ranked[0] ?? null;
}
