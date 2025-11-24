import { isTRAXLoaded, isTRAXLoading, loadTRAX } from "$lib";
import { error } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import TRAX from "translink-rail-api";

export const load: PageServerLoad = async ({}) => {
	if (!isTRAXLoaded) {
		loadTRAX();
		throw error(503, "Loading TRAX data... Please retry in a few minutes.");
	}

	if (isTRAXLoading) throw error(503, "Loading TRAX data... Please retry in a few minutes.");

	let tripUpdates = TRAX.getTripUpdates();
	let stopTimeUpdates = TRAX.getStopTimeUpdates();
	let vehiclePositions = TRAX.getVehiclePositions();

	return { tripUpdates, stopTimeUpdates, vehiclePositions };
};
