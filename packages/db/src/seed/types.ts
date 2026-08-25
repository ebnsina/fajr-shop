// One compact shape for every vertical, so a catalogue is data not code.
export type P = {
	t: string; // title
	c: string; // category
	p: number; // price in taka
	was?: number; // compare-at in taka
	opt?: [string, string[]]; // one variant axis
	sw?: string[]; // swatch hexes, positional against opt values
	spec?: Record<string, string>; // filterable attributes
	s?: number; // base stock
};

export type Vertical = {
	key: string;
	shop: string;
	categories: string[];
	units?: Record<string, string>; // attribute name -> unit
	products: P[];
	hero: { heading: string; subheading: string; cta: string };
	usps: { title: string; body: string }[];
	faq: { q: string; a: string }[];
	quotes: { quote: string; name: string }[];
	promo: { heading: string; subheading: string };
	announcement: string;
	supportHours: string;
	meta: { title: string; description: string };
};
