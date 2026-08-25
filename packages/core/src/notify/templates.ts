// Bangla by default — the storefront's audience reads Bangla, and an English order notification
// is a message half the customers skip.
export type TemplateName =
	| 'order.placed'
	| 'order.confirmed'
	| 'order.shipped'
	| 'order.delivered'
	| 'cart.abandoned'
	| 'otp';

type Vars = Record<string, string | number>;

const BN: Record<TemplateName, (v: Vars) => string> = {
	'order.placed': (v) => `${v.store}: অর্ডার ${v.code} পেয়েছি। মোট ৳${v.total}। শীঘ্রই কল করব।`,
	'order.confirmed': (v) => `${v.store}: অর্ডার ${v.code} নিশ্চিত হয়েছে। ধন্যবাদ।`,
	'order.shipped': (v) => `${v.store}: অর্ডার ${v.code} পাঠানো হয়েছে। ডেলিভারিতে ৳${v.due} দিন।`,
	'order.delivered': (v) => `${v.store}: অর্ডার ${v.code} ডেলিভারি হয়েছে। ধন্যবাদ!`,
	'cart.abandoned': (v) => `${v.store}: আপনার ব্যাগে ${v.count}টি পণ্য আছে (৳${v.total})। অর্ডার সম্পূর্ণ করুন।`,
	otp: (v) => `${v.code} — ${v.store} লগইন কোড। কাউকে দেবেন না।`
};

const EN: Record<TemplateName, (v: Vars) => string> = {
	'order.placed': (v) => `${v.store}: order ${v.code} received. Total BDT ${v.total}. We will call to confirm.`,
	'order.confirmed': (v) => `${v.store}: order ${v.code} is confirmed. Thank you.`,
	'order.shipped': (v) => `${v.store}: order ${v.code} is on the way. Pay BDT ${v.due} on delivery.`,
	'order.delivered': (v) => `${v.store}: order ${v.code} delivered. Thank you!`,
	'cart.abandoned': (v) => `${v.store}: ${v.count} item(s) worth BDT ${v.total} are still in your bag. Complete your order.`,
	otp: (v) => `${v.code} is your ${v.store} login code. Do not share it.`
};

export function render(name: TemplateName, vars: Vars, locale = 'bn'): string {
	return (locale.startsWith('bn') ? BN : EN)[name](vars);
}

// Bangla is Unicode: 70 characters per SMS part, not 160, and concatenated parts lose a few
// more to the header. Worth knowing what a send actually costs.
export function parts(body: string): number {
	const unicode = /[^\u0000-\u007F]/.test(body);
	const single = unicode ? 70 : 160;
	const multi = unicode ? 67 : 153;
	return body.length <= single ? 1 : Math.ceil(body.length / multi);
}
