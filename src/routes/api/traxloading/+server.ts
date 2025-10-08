import { isTRAXLoaded, isTRAXLoading, loadTRAX } from "$lib";
import { json } from "@sveltejs/kit";

export function GET() {
	if (!isTRAXLoaded) {
		loadTRAX();
		return json({ traxLoading: true });
	}

	if (isTRAXLoading) return json({ traxLoading: true });
	return json({ traxLoading: false });
}
