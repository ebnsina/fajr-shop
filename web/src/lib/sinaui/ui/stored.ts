/** Reads JSON saved in this browser: the fallback if there's none, it's unreadable or storage is blocked. */
export function load<T>(key: string, fallback: T): T {
	try {
		const raw = localStorage.getItem(key);
		return raw === null ? fallback : (JSON.parse(raw) as T);
	} catch {
		return fallback;
	}
}

/** Saves JSON in this browser; where storage is blocked or full it lasts for this visit only. */
export function save(key: string, value: unknown) {
	try {
		localStorage.setItem(key, JSON.stringify(value));
	} catch {
		/* blocked or full */
	}
}
