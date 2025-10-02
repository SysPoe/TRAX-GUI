import TRAX from "translink-rail-api";
import { isTRAXLoaded, loadTRAX } from "$lib";
import type { PageServerLoad } from "./$types";
import { error } from "@sveltejs/kit";

export const load: PageServerLoad = async ({ params }) => {
	if (!isTRAXLoaded) {
		loadTRAX();
		throw error(503, "Loading TRAX data... Please retry in a few minutes.");
	}

	let stations = TRAX.getStations()
		.map((v) => v.toSerializable())
		.sort((a, b) => (a.stop_name || "").localeCompare(b.stop_name || ""));
	return { stations };
};
