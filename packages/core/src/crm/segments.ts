// RFM, scored as plain thresholds rather than quintiles.
export type Rfm = { recencyDays: number; frequency: number; monetaryMinor: number };

export type Segment =
	| 'champion'
	| 'loyal'
	| 'promising'
	| 'new'
	| 'at_risk'
	| 'lost'
	| 'problem';

export type Scored = {
	segment: Segment;
	label: string;
	/** What a staff member should actually do about it. */
	action: string;
};

const SEGMENTS: Record<Segment, { label: string; action: string }> = {
	champion: { label: 'Champion', action: 'Early access and new arrivals first.' },
	loyal: { label: 'Loyal', action: 'Worth a thank-you and a small perk.' },
	promising: { label: 'Promising', action: 'One nudge could make them regular.' },
	new: { label: 'New', action: 'Make the second order easy.' },
	at_risk: { label: 'At risk', action: 'They used to buy. Reach out before they forget.' },
	lost: { label: 'Lost', action: 'Only worth a campaign, not a call.' },
	problem: { label: 'High returns', action: 'Require advance payment.' }
};

export function segmentOf(
	rfm: Rfm,
	history: { delivered: number; returned: number } = { delivered: 0, returned: 0 }
): Scored {
	const total = history.delivered + history.returned;
	const returnRate = total > 0 ? history.returned / total : 0;

	// A customer who returns most of what they order is not a segment, they are
	// a cost — and that fact outranks how recently they ordered.
	if (total >= 3 && returnRate > 0.5) return { segment: 'problem', ...SEGMENTS.problem };

	const { recencyDays, frequency, monetaryMinor } = rfm;

	if (frequency >= 5 && recencyDays <= 60) return { segment: 'champion', ...SEGMENTS.champion };
	if (frequency >= 3 && recencyDays <= 90) return { segment: 'loyal', ...SEGMENTS.loyal };
	if (frequency >= 2 && recencyDays <= 120) return { segment: 'promising', ...SEGMENTS.promising };
	// One order, and recent enough that the second one is still plausible.
	if (frequency === 1 && recencyDays <= 45) return { segment: 'new', ...SEGMENTS.new };
	if (recencyDays > 180) return { segment: 'lost', ...SEGMENTS.lost };
	return { segment: 'at_risk', ...SEGMENTS.at_risk };
}

export const SEGMENT_LABELS = SEGMENTS;
