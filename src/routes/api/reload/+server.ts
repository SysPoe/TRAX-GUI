import { isTRAXLoaded, isTRAXLoading, loadTRAX } from "$lib";
import TRAX from "translink-rail-api";

export function GET() {
	if (!isTRAXLoading && isTRAXLoaded) {
		TRAX.updateRealtime();
		return new Response("Realtime reload initiated.", { status: 200 });
	} else if (!isTRAXLoading && !isTRAXLoaded) {
		loadTRAX();
        return new Response("Static reload initiated.", { status: 200 });
    }
    return new Response("Reload already in progress.", { status: 503 });
}
