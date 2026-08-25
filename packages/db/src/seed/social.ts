// Review and question text for the demo shops. A PDP with an empty reviews
// panel demonstrates nothing; these make the section real without pretending
// every product is beloved.
export const REVIEW_POOL = [
	{ rating: 5, title: 'Exactly as pictured', body: 'Arrived in two days and looks exactly like the photos. No surprises, which is what I wanted.' },
	{ rating: 5, title: 'Worth it', body: 'Second time ordering from here. Quality has been consistent both times and delivery was quick.' },
	{ rating: 4, title: 'Good, runs slightly large', body: 'Happy with it overall. Sizing is a touch generous, so consider going one down if you are between sizes.' },
	{ rating: 4, title: null, body: 'Does the job well. Packaging could be a little sturdier but the item itself arrived fine.' },
	{ rating: 5, title: 'Fast delivery', body: 'Ordered in the evening and it was here the next day. Paid on delivery with no fuss.' },
	{ rating: 3, title: 'Fine for the price', body: 'Not bad, not remarkable. It matches the description, so no complaints, but I would not call it exceptional.' },
	{ rating: 5, title: null, body: 'Called to confirm before shipping which I appreciated. The item is genuinely good quality.' },
	{ rating: 4, title: 'Recommended', body: 'Would buy again. Took three days to reach me outside the city, which seems reasonable.' },
	{ rating: 2, title: 'Colour was off', body: 'The shade is noticeably darker than the listing photo. Exchange was handled without argument, so two stars rather than one.' },
	{ rating: 5, title: 'Better than expected', body: 'Honestly did not expect this much for the price. The finish is clean and it feels durable.' }
];

export const REVIEWERS = [
	'Rina Akter', 'Sadia Haque', 'Imran Hossain', 'Nusrat Jahan', 'Abdul Karim',
	'Farhana Kabir', 'Tanvir Islam', 'Maliha Chowdhury', 'Rakib Mahmud', 'Shirin Ahmed'
];

export const GULF_REVIEWERS = [
	'Mariam Al Suwaidi', 'Omar Al Balushi', 'Fatima Khan', 'Yousef Al Hammadi', 'Noura Hassan',
	'Khalid Al Mansoori', 'Aisha Rahman', 'Saeed Al Nuaimi', 'Layla Mostafa', 'Hamad Al Ali'
];

export const QUESTION_POOL = [
	{ q: 'Is cash on delivery available outside the city?', a: 'Yes, cash on delivery works everywhere we deliver. The delivery charge is paid in advance and the rest to the courier.' },
	{ q: 'How long does delivery usually take?', a: 'One to two days inside the city and two to four days elsewhere. You get a tracking message as soon as it ships.' },
	{ q: 'Can I exchange it if the size is wrong?', a: 'Yes, within seven days as long as it is unused with the tag still attached. Message us and we will arrange the pickup.' },
	{ q: 'Is this the same as the photo?', a: 'The photos are taken in daylight without filters. Screens vary a little, so message us if you want a closer look before ordering.' },
	{ q: 'Do you have this in other colours?', a: 'Whatever is in stock is listed on this page. New colours go up as they arrive, so it is worth checking back.' }
];
