import TRAX, { type SerializableAugmentedTrip } from "translink-rail-api";
import { isTRAXLoaded, isTRAXLoading, loadTRAX } from "$lib";
import { error } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import * as gtfs from "qdf-gtfs";

export const load: PageServerLoad = async ({ params, locals }) => {
	if (!isTRAXLoaded) {
		loadTRAX();
		throw error(503, "Loading TRAX data... Please retry in a few minutes.");
	}

	if (isTRAXLoading) throw error(503, "Loading TRAX data... Please retry in a few minutes.");

	let { date, series } = params;

	let runSeries = TRAX.getRunSeries(date, series, true);

	// Get additional information for each trip
	let trips: { [trip_id: string]: SerializableAugmentedTrip } = {};
	let routes: { [route_id: string]: gtfs.Route } = {};
	let expressStrings: { [trip_id: string]: string } = {};

	for (const tripInfo of runSeries.trips) {
		const trip = TRAX.getAugmentedTrips(tripInfo.trip_id)[0];
		if (trip) {
			trips[tripInfo.trip_id] = trip.toSerializable();
			expressStrings[tripInfo.trip_id] = TRAX.express.findExpressString(trip.expressInfo, "");

			// Get route information
			if (trip._trip.route_id && !routes[trip._trip.route_id]) {
				const route = TRAX.getRawRoutes(trip._trip.route_id)[0];
				if (route) routes[trip._trip.route_id] = route;
			}
		}
	}

	let stations: { [station_id: string]: gtfs.Stop } = {};
	let _st = TRAX.getRawStops();
	for (const station of _st) stations[station.stop_id] = station;

	if (!locals.session?.data?.admin === true) runSeries.vehicle_sightings = [];

	return {
		runSeries,
		trips,
		routes,
		expressStrings,
		stations,
	};
};
