// A small RFC 4180 parser rather than a dependency.
export function parseCsv(input: string): string[][] {
	const rows: string[][] = [];
	let row: string[] = [];
	let field = '';
	let quoted = false;
	let i = 0;

	// Strip a UTF-8 BOM: Excel adds one and it corrupts the first header.
	if (input.charCodeAt(0) === 0xfeff) i = 1;

	while (i < input.length) {
		const c = input[i]!;

		if (quoted) {
			if (c === '"') {
				if (input[i + 1] === '"') {
					field += '"';
					i += 2;
					continue;
				}
				quoted = false;
				i += 1;
				continue;
			}
			field += c;
			i += 1;
			continue;
		}

		if (c === '"') {
			quoted = true;
			i += 1;
			continue;
		}

		if (c === ',') {
			row.push(field);
			field = '';
			i += 1;
			continue;
		}

		if (c === '\r' || c === '\n') {
			// Treat CRLF as one break.
			if (c === '\r' && input[i + 1] === '\n') i += 1;
			row.push(field);
			// Skip blank lines rather than emitting empty products.
			if (row.some((f) => f.trim() !== '')) rows.push(row);
			row = [];
			field = '';
			i += 1;
			continue;
		}

		field += c;
		i += 1;
	}

	row.push(field);
	if (row.some((f) => f.trim() !== '')) rows.push(row);

	return rows;
}

export type Sheet = { headers: string[]; rows: Record<string, string>[] };

export function toSheet(csv: string): Sheet {
	const parsed = parseCsv(csv);
	if (parsed.length === 0) return { headers: [], rows: [] };

	const headers = parsed[0]!.map((h) => h.trim());
	const rows = parsed.slice(1).map((cells) =>
		Object.fromEntries(headers.map((h, i) => [h, (cells[i] ?? '').trim()]))
	);
	return { headers, rows };
}
