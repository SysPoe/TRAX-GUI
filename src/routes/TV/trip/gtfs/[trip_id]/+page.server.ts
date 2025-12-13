import TRAX from "translink-rail-api";
import { isTRAXLoaded, isTRAXLoading, loadTRAX } from "$lib";
import { error } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import type { SerializableAugmentedStop } from "translink-rail-api";

function dateDiff(dateStr: string): number {
	let now = new Date(Date.now() + 10 * 3_600_000);
	now.setUTCHours(0, 0, 0, 0);
	let y = Number.parseInt(dateStr.slice(0, 4));
	let m = Number.parseInt(dateStr.slice(4, 6)) - 1;
	let d = Number.parseInt(dateStr.slice(6, 8));
	let date = new Date(Date.UTC(y, m, d));
	if (date < now) return Number.MAX_SAFE_INTEGER;
	return Math.abs(date.getTime() - now.getTime());
}

export const load: PageServerLoad = async ({ params, locals }) => {
	if (!isTRAXLoaded) {
		loadTRAX();
		throw error(503, "Loading TRAX data... Please retry in a few minutes.");
	}

	if (isTRAXLoading) throw error(503, "Loading TRAX data... Please retry in a few minutes.");

	let { trip_id } = params;
	let trip = TRAX.getAugmentedTrips(trip_id)[0];
	if (!trip) throw error(404, `Trip "${trip_id}" not found`);
	let stations: { [stop_id: string]: SerializableAugmentedStop } = {};
	let route = TRAX.getRawRoutes(trip._trip.route_id)[0];
	let expressString = TRAX.express.findExpressString(trip.expressInfo);

	let serviceCapacities: { [stop_id: string]: string | null } = {};

	for (const stopTime of trip.stopTimes) {
		stations[stopTime.scheduled_stop?.stop_id as any as string] = stopTime.scheduled_stop?.toSerializable() as any;
		if (stopTime.scheduled_parent_station)
			stations[stopTime.scheduled_parent_station?.stop_id as any as string] =
				stopTime.scheduled_parent_station?.toSerializable() as any;
		serviceCapacities[stopTime.actual_stop?.stop_id ?? stopTime.scheduled_stop?.stop_id ?? ""] = stopTime.getServiceCapacity(stopTime.scheduled_departure_dates.sort((a, b) => dateDiff(a) - dateDiff(b))[0])
	}

	let serialized = trip.toSerializable();

	const extraDetails = locals.session?.data?.extraDetails ?? false;
	if (!extraDetails)
		serialized.stopTimes = serialized.stopTimes.filter((v) => !v.passing);

	return { trip: serialized, stations, route, expressString, extraDetails, serviceCapacities };
};
