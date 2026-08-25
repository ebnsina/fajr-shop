// One pure function, not a model. Every input is visible, every output is explainable to a
// staff member on a phone call, and it is testable without a network or a database.
export type CourierStats = { delivered: number; returned: number };

export type Band = 'low' | 'medium' | 'high' | 'unknown';

export type ScoreInput = {
	/** What the aggregator knows: this phone's history across every shop. */
	network: CourierStats;
	/** What only we know: this phone's history with *this* merchant. */
	own?: CourierStats;
};

export type Scored = {
	score: number;
	band: Band;
	networkRate: number | null;
	ownRate: number | null;
	totalOrders: number;
	reason: string;
};

export const THRESHOLDS = { medium: 30, high: 60 } as const;

/** Own history counts double: it is the signal no competitor can see. */
const OWN_WEIGHT = 2;

/** BD COD return rates run 20–35%. This is the "we know nothing" expectation. */
const BASELINE_RETURN_RATE = 0.25;

/** Worth about four orders of evidence — enough to blunt a single data point. */
const PRIOR_WEIGHT = 4;

const rate = (s: CourierStats): number | null => {
	const total = s.delivered + s.returned;
	return total === 0 ? null : s.returned / total;
};

export function scoreRisk(input: ScoreInput): Scored {
	const networkRate = rate(input.network);
	const ownRate = input.own ? rate(input.own) : null;
	const networkOrders = input.network.delivered + input.network.returned;
	const ownOrders = input.own ? input.own.delivered + input.own.returned : 0;
	const totalOrders = networkOrders + ownOrders;

	if (totalOrders === 0) {
		return {
			score: 0,
			band: 'unknown',
			networkRate: null,
			ownRate: null,
			totalOrders: 0,
			reason: 'No delivery history anywhere. Treat as a normal first order.'
		};
	}

	// Weighted mean of the two return rates, so a good customer of *ours* is not
	// condemned by a bad network record, and vice versa.
	const weightNetwork = networkOrders;
	const weightOwn = ownOrders * OWN_WEIGHT;
	const combined =
		((networkRate ?? 0) * weightNetwork + (ownRate ?? 0) * weightOwn) /
		Math.max(1, weightNetwork + weightOwn);

	// Thin histories are shrunk toward the market baseline, not toward zero.
	const adjusted =
		(combined * totalOrders + BASELINE_RETURN_RATE * PRIOR_WEIGHT) / (totalOrders + PRIOR_WEIGHT);
	const score = Math.round(adjusted * 100);

	const band: Band = score >= THRESHOLDS.high ? 'high' : score >= THRESHOLDS.medium ? 'medium' : 'low';

	const pct = (r: number | null) => (r === null ? '—' : `${Math.round(r * 100)}%`);
	const reason =
		ownOrders > 0
			? `${totalOrders} past orders · ${pct(networkRate)} returned elsewhere, ${pct(ownRate)} with us`
			: `${networkOrders} past orders · ${pct(networkRate)} returned across couriers`;

	return { score, band, networkRate, ownRate, totalOrders, reason };
}

export type Action = 'auto_confirm' | 'verify_call' | 'require_advance';

/** Thresholds live in settings so a merchant can tune without a deploy. */
export function actionFor(band: Band): Action {
	switch (band) {
		case 'low':
			return 'auto_confirm';
		case 'high':
			return 'require_advance';
		// A third party being down must never block a sale. Unknown and medium
		// both mean "a human decides", which is what the queue is for.
		default:
			return 'verify_call';
	}
}
