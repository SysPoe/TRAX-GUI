import TRAX from "translink-rail-api";
import { isTRAXLoaded, isTRAXLoading, loadTRAX } from "$lib";
import { error } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals }) => {
	if (!isTRAXLoaded) {
		loadTRAX();
		throw error(503, "Loading TRAX data... Please retry in a few minutes.");
	}

	if (isTRAXLoading) throw error(503, "Loading TRAX data... Please retry in a few minutes.");

	let stations = TRAX.getStations()
		.map((v) => v.toSerializable())
		.sort((a, b) => (a.stop_name || "").localeCompare(b.stop_name || ""));
	let today = Number.parseInt(new Date(Date.now() + 10 * 3_600_000).toISOString().split("T")[0].replaceAll("-", ""));
	let dates = [
		...new Set(
			TRAX.getAugmentedTrips()
				.flatMap((v) => v.instances.flatMap(q => q.scheduledTripDates))
		),
	]
		.sort()
		.filter((v) => Number.parseInt(v) >= today);

	let routes: { [key: string]: string } = {};
	let routePairs: { [key: string]: string } = {};

	for (const v of TRAX.getRawRoutes().filter((v) => v.route_type == 2)) {
		if (v.route_short_name?.slice(0, 2) && v.route_long_name?.split("-")[0].trim())
			routes[v.route_short_name?.slice(0, 2)] = v.route_long_name?.split("-")[0].trim();
		if (v.route_short_name?.slice(2) && v.route_long_name?.split("-")[1]?.trim())
			routes[v.route_short_name?.slice(2)] = v.route_long_name?.split("-")[1]?.trim();
		if (v.route_short_name && v.route_long_name) routePairs[v.route_short_name] = v.route_long_name;
	}

	return { stations, dates, routes, routePairs, extraDetails: locals.session?.data?.extraDetails ?? false };
};
