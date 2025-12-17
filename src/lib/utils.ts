export function formatTimestamp(ts?: number | null, seconds: boolean = false): string {
	if (ts === null || ts === undefined) return "--:--";
	const h = Math.floor(ts / 3600);
	const m = Math.floor((ts % 3600) / 60);
	const s = ts % 60;
	let res = `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
	if (seconds) res += `:${s.toString().padStart(2, "0")}`;
	return res;
}

export function safeCount(getter: () => any[]): number {
	try {
		const res = getter();
		return Array.isArray(res) ? res.length : 0;
	} catch (e) {
		return 0;
	}
}
