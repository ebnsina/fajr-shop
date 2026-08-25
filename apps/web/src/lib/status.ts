import type { Tone } from '$lib/components/Badge.svelte';
import type { Segment } from '@fajr/core/crm';

// One mapping from a status to a tone, so the same word never appears in two colours on two
// screens.
export const ORDER_TONE: Record<string, Tone> = {
	pending: 'warning',
	confirmed: 'info',
	processing: 'info',
	shipped: 'info',
	delivered: 'success',
	cancelled: 'neutral',
	returned: 'danger'
};

export const PAYMENT_TONE: Record<string, Tone> = {
	unpaid: 'neutral',
	advance_paid: 'warning',
	paid: 'success',
	refunded: 'neutral',
	partially_refunded: 'warning'
};

export const RISK_TONE: Record<string, Tone> = {
	low: 'success',
	medium: 'warning',
	high: 'danger',
	unknown: 'neutral'
};

// Kept here, not imported from core: a component that imports a core *value*
// pulls the database driver into the client bundle and the page 500s.
export const SEGMENT_LABELS: Record<Segment, string> = {
	champion: 'Champion',
	loyal: 'Loyal',
	promising: 'Promising',
	new: 'New',
	at_risk: 'At risk',
	lost: 'Lost',
	problem: 'High returns'
};

export const SEGMENT_TONE: Record<string, Tone> = {
	champion: 'success',
	loyal: 'info',
	promising: 'info',
	new: 'neutral',
	at_risk: 'warning',
	lost: 'neutral',
	problem: 'danger'
};

export const PRODUCT_TONE: Record<string, Tone> = {
	active: 'success',
	draft: 'warning',
	archived: 'neutral'
};
