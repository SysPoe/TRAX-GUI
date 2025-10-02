import TRAX from "translink-rail-api";
import { isTRAXLoaded, loadTRAX } from "$lib";
import { error } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({}) => {
	if (!isTRAXLoaded) {
		loadTRAX();
		throw error(503, "Loading TRAX data... Please retry in a few minutes.");
	}
	let stations = TRAX.getStations()
		.map((v) => v.toSerializable())
		.sort((a, b) => (a.stop_name || "").localeCompare(b.stop_name || ""));
	let dates = [
		...new Set(
			TRAX.getAugmentedTrips()
				.map((v) => v.scheduledTripDates)
				.flat(),
		),
	].sort();
	return { stations, dates };
};
