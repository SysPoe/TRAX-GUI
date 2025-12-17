import { TRAX, isTRAXLoaded, isTRAXLoading, loadTRAX } from "$lib/server/trax";
import { error } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({}) => {
	if (!isTRAXLoaded) {
		loadTRAX();
		throw error(503, "Loading TRAX data... Please retry in a few minutes.");
	}

	if (isTRAXLoading) throw error(503, "Loading TRAX data... Please retry in a few minutes.");

	let tripUpdates = TRAX.getTripUpdates();
	let stopTimeUpdates = tripUpdates.flatMap(v => v.stop_time_updates);
	let vehiclePositions = TRAX.getVehiclePositions();

	return { tripUpdates, stopTimeUpdates, vehiclePositions };
};
