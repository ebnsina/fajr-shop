import { db, order, orderItem, product, shipment, eq, desc, sql, and } from '@fajr/db';

export type Suggestion = {
	// Shown as the reason this reply was offered, so staff can judge it.
	because: string;
	body: string;
};

// What the customer is asking about, from the words they used. Deliberately not
// a model: a wrong guess here costs a staff member two seconds, and a model that
// needs a key nobody has configured costs them the whole feature.
export type Intent = 'order_status' | 'delivery' | 'price' | 'stock' | 'returns' | 'payment' | 'unknown';

// Ordered by specificity, not by how common each is: "exchange this for another
// size" is a returns question, and matching `size` first would answer the wrong
// one. Bangla alternatives carry no \b, because a word boundary needs an ASCII
// word character beside it and Bengali script has none — that silently made
// every Bangla message read as unknown.
const PATTERNS: [Intent, RegExp][] = [
	['returns', /\b(return|returned|exchange|refund|replace)\b|ফেরত|বদল/i],
	['payment', /\b(pay|paid|payment|bkash|nagad|cod|cash on delivery|advance)\b|বিকাশ|পেমেন্ট/i],
	['order_status', /\b(order|parcel|shipment|track|tracking|status)\b|অর্ডার|পার্সেল/i],
	['delivery', /\b(deliver|delivery|courier|shipping|kotodin|kobe|when will)\b|ডেলিভারি|কবে|কুরিয়ার/i],
	['stock', /\b(stock|available|size|colour|color)\b|আছে|সাইজ/i],
	['price', /\b(price|cost|koto|discount|how much)\b|কত|দাম/i]
];

export function intentOf(text: string): Intent {
	for (const [intent, pattern] of PATTERNS) if (pattern.test(text)) return intent;
	return 'unknown';
}

const when = (d: Date | null) =>
	d ? new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium' }).format(d) : 'shortly';

// Drafts a reply from what we actually know: this customer's latest order, the
// shop's own delivery terms. Staff send it, edit it, or ignore it.
export async function suggest(input: {
	text: string;
	phoneE164?: string | null;
	storeName: string;
	deliversTo: string;
}): Promise<Suggestion[]> {
	const intent = intentOf(input.text);
	const out: Suggestion[] = [];

	const latest = input.phoneE164
		? await db.read.query.order.findFirst({
				where: eq(order.phoneE164, input.phoneE164),
				orderBy: desc(order.placedAt)
			})
		: null;

	if (latest && (intent === 'order_status' || intent === 'delivery' || intent === 'unknown')) {
		const [items] = await db.read
			.select({ n: sql<number>`count(*)::int` })
			.from(orderItem)
			.where(eq(orderItem.orderId, latest.id));

		// The delivery date lives on the parcel, not the order.
		const parcel = await db.read.query.shipment.findFirst({
			columns: { deliveredAt: true },
			where: eq(shipment.orderId, latest.id),
			orderBy: desc(shipment.createdAt)
		});

		const status: Record<string, string> = {
			pending: `We have your order ${latest.publicCode} and will call to confirm it shortly.`,
			confirmed: `Your order ${latest.publicCode} is confirmed and being packed.`,
			processing: `Your order ${latest.publicCode} is being packed now.`,
			shipped: `Your order ${latest.publicCode} is on the way with the courier.`,
			delivered: `Your order ${latest.publicCode} was delivered on ${when(parcel?.deliveredAt ?? null)}.`,
			cancelled: `Your order ${latest.publicCode} was cancelled. Shall we place it again?`,
			returned: `Your order ${latest.publicCode} came back to us. Would you like a replacement?`
		};

		out.push({
			because: `Their latest order is ${latest.publicCode}, ${latest.status}, ${items?.n ?? 0} item(s)`,
			body: status[latest.status] ?? `Your order ${latest.publicCode} is with us.`
		});
	}

	if (intent === 'delivery') {
		out.push({
			because: 'They asked about delivery',
			body: `We deliver ${input.deliversTo}. Inside the main city it is usually one to two days, and elsewhere two to four.`
		});
	}

	if (intent === 'returns') {
		out.push({
			because: 'They asked about returning or exchanging',
			body: 'You can exchange within 7 days as long as it is unused with the tag on. Send us a photo and we will arrange the pickup.'
		});
	}

	if (intent === 'payment') {
		out.push({
			because: 'They asked about paying',
			body: `Cash on delivery is available ${input.deliversTo}. You pay the delivery charge in advance and the rest to the courier.`
		});
	}

	if (intent === 'price' || intent === 'stock') {
		// Naming the product is the whole value here; a generic reply is noise.
		const words = input.text.split(/\s+/).filter((w) => w.length > 3).slice(0, 6);
		const hits = words.length
			? await db.read
					.select({ title: product.title, slug: product.slug })
					.from(product)
					.where(
						and(
							eq(product.status, 'active'),
							sql`${product.title} ilike any(array[${sql.join(words.map((w) => sql`${'%' + w + '%'}`), sql`, `)}])`
						)
					)
					.limit(3)
			: [];

		for (const hit of hits) {
			out.push({
				because: `Their message mentions “${hit.title}”`,
				body: `You can see ${hit.title} here: /products/${hit.slug}`
			});
		}
	}

	if (!out.length) {
		out.push({
			because: 'Nothing specific matched, so this just keeps them warm',
			body: `Thank you for messaging ${input.storeName}. Could you tell us your order code or the product you are asking about?`
		});
	}

	return out.slice(0, 3);
}
