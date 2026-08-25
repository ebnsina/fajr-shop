import { db, fraudCheck, order, newId, eq, and, sql, gte } from '@fajr/db';
import { scoreRisk, actionFor, type Band, type Scored, type CourierStats } from './score.ts';
import { providerFromEnv, type RiskProvider } from './providers.ts';
import { audit } from '../audit/index.ts';
import { consume } from '../auth/ratelimit.ts';

export * from './score.ts';
export * from './providers.ts';

/** Aggregator data changes slowly and each call costs money. */
export const CACHE_DAYS = 7;

export type Assessment = Scored & {
	action: ReturnType<typeof actionFor>;
	provider: string;
	cached: boolean;
	breakdown: Record<string, unknown> | null;
};

/** This phone's history with *this* merchant — the part no competitor can see. */
export async function ownHistory(phoneE164: string): Promise<CourierStats> {
	const rows = (await db.read.execute(sql`
		select
			count(*) filter (where status = 'delivered')                 as delivered,
			count(*) filter (where status in ('returned', 'cancelled'))  as returned
		from "order"
		where phone_e164 = ${phoneE164}
	`)) as unknown as { delivered: number | string; returned: number | string }[];

	return {
		delivered: Number(rows[0]?.delivered ?? 0),
		returned: Number(rows[0]?.returned ?? 0)
	};
}

// The lookup that runs at checkout. Never throws and never blocks a sale: any failure lands on
// `unknown`, which routes to the verification queue.
export async function assess(
	phoneE164: string,
	opts: { provider?: RiskProvider; ip?: string | null; force?: boolean } = {}
): Promise<Assessment> {
	const provider = opts.provider ?? providerFromEnv();
	const own = await ownHistory(phoneE164);

	// It's a paid API and a phone-enumeration oracle. Limit it per IP.
	if (opts.ip) {
		const limit = await consume(`risk:ip:${opts.ip}`, 30, 60 * 60_000);
		if (!limit.allowed) {
			const scored = scoreRisk({ network: { delivered: 0, returned: 0 }, own });
			return { ...scored, action: actionFor(scored.band), provider: 'rate_limited', cached: true, breakdown: null };
		}
	}

	const cached = opts.force
		? undefined
		: await db.read.query.fraudCheck.findFirst({
				where: and(
					eq(fraudCheck.phoneE164, phoneE164),
					eq(fraudCheck.provider, provider.name),
					gte(fraudCheck.checkedAt, new Date(Date.now() - CACHE_DAYS * 86_400_000))
				)
			});

	// One call, one result: the network totals and the per-courier breakdown both
	// come from the same response, so they can never disagree.
	const fresh = cached ? null : await provider.lookup(phoneE164).catch(() => null);

	const network: CourierStats = cached
		? { delivered: cached.delivered, returned: cached.returned }
		: (fresh?.network ?? { delivered: 0, returned: 0 });

	const breakdown = cached ? cached.raw : (fresh?.raw ?? null);

	const scored = scoreRisk({ network, own });

	// Only cache a real answer. Caching "we got nothing" would keep returning
	// nothing for a week after the provider recovers.
	if (!cached && fresh) {
		await db.write
			.insert(fraudCheck)
			.values({
				id: newId('frd'),
				phoneE164,
				provider: provider.name,
				delivered: network.delivered,
				returned: network.returned,
				score: scored.score,
				band: scored.band,
				raw: breakdown
			})
			.onConflictDoUpdate({
				target: [fraudCheck.phoneE164, fraudCheck.provider],
				set: {
					delivered: network.delivered,
					returned: network.returned,
					score: scored.score,
					band: scored.band,
					raw: breakdown,
					checkedAt: new Date()
				}
			});
	}

	await audit({
		actorType: 'system',
		action: 'risk.assess',
		entity: 'phone',
		entityId: phoneE164,
		meta: { score: scored.score, band: scored.band, provider: provider.name, cached: Boolean(cached) }
	});

	return {
		...scored,
		action: actionFor(scored.band),
		provider: provider.name,
		cached: Boolean(cached),
		breakdown: (breakdown as Record<string, unknown> | null) ?? null
	};
}

/** Stamp the decision onto the order — the score at decision time, never recomputed. */
export async function stampOrder(orderId: string, assessment: Assessment): Promise<void> {
	await db.write
		.update(order)
		.set({ riskScore: assessment.score, riskBand: assessment.band as Band, updatedAt: new Date() })
		.where(eq(order.id, orderId));
}
