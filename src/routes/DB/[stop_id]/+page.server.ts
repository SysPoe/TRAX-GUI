import TRAX, {
	formatTimestamp,
	type SerializableAugmentedStopTime,
	type SerializableAugmentedTrip,
} from "translink-rail-api";
import * as gtfs from "gtfs";
import { getUpcomingQRTravelDepartures, isTRAXLoaded, isTRAXLoading, loadTRAX, type UpcomingQRTravelDeparture } from "$lib";
import type { PageServerLoad } from "./$types";
import { error } from "@sveltejs/kit";

export const load: PageServerLoad = async ({ params }) => {
	if (!isTRAXLoaded) {
		loadTRAX();
		throw error(503, "Loading TRAX data... Please retry in a few minutes.");
	}

	if (isTRAXLoading) throw error(503, "Loading TRAX data... Please retry in a few minutes.");

	const { stop_id } = params;

	let today = Number.parseInt(new Date(Date.now() + 10 * 3_600_000).toISOString().split("T")[0].replaceAll("-", ""));

	let now = new Date();
	let startTime = now.getHours() + ":" + now.getMinutes() + ":00";
	let endTime = now.getHours() + 4 + ":" + now.getMinutes() + ":00";

	let stop = TRAX.getAugmentedStops(stop_id)[0];
	if (stop === undefined || stop === null) throw error(404, `Stop with ID "${stop_id}" not found.`);
	let departures: (SerializableAugmentedStopTime & {
		dep_type: "gtfs";
		express_string: string;
		last_stop_id: string;
		scheduled_departure_time: string;
		actual_departure_time: string;
		departs_in: string;
		departsInSecs: number;
	})[] = stop
		.getDepartures(today, startTime, endTime)
		.map((v) => {
			const actualTime = formatTimestamp(
				v.actual_departure_timestamp || v.actual_arrival_timestamp
					? Math.floor((v.actual_departure_timestamp || v.actual_arrival_timestamp || 0) / 60) * 60
					: v.actual_departure_timestamp || v.actual_arrival_timestamp,
			);
			// Get current time in HH:mm
			const nowTime = `${now.getHours().toString().padStart(2, "0")}:${now
				.getMinutes()
				.toString()
				.padStart(2, "0")}`;
			return {
				...v.toSerializable(),
				dep_type: "gtfs" as "gtfs",
				express_string: v.express_string,
				actual_departure_time: actualTime,
				scheduled_departure_time: formatTimestamp(
					v.scheduled_departure_timestamp || v.scheduled_arrival_timestamp,
				),
				last_stop_id:
					TRAX.getAugmentedTrips(v.trip_id)[0].stopTimes.at(-1)?.actual_parent_station?.stop_id ||
					TRAX.getAugmentedTrips(v.trip_id)[0].stopTimes.at(-1)?.actual_stop?.stop_id ||
					"",
				departs_in:
					actualTime && actualTime.match(/^\d{2}:\d{2}/)
						? TRAX.utils.time.timeDiff(actualTime.slice(0, 5), nowTime)
						: "-",
				departsInSecs:
					actualTime && actualTime.match(/^\d{2}:\d{2}/)
						? TRAX.utils.time.secTimeDiff(actualTime.slice(0, 5), nowTime)
						: -1,
			};
		})
		.sort(
			(a, b) =>
				(a.actual_departure_timestamp || a.actual_arrival_timestamp || 0) -
				(b.actual_departure_timestamp || b.actual_arrival_timestamp || 0),
		);

	let trips: {
		[trip_id: string]: SerializableAugmentedTrip;
	} = {};
	for (const departure of departures) {
		const trip = TRAX.getAugmentedTrips(departure.trip_id)[0];
		if (trip) {
			trips[trip._trip.trip_id] = trip.toSerializable();
		}
	}

	let routes: {
		[route_id: string]: gtfs.Route;
	} = {};
	for (const trip of Object.values(trips)) {
		if (trip._trip.route_id && !routes[trip._trip.route_id]) {
			const route = TRAX.getRawRoutes(trip._trip.route_id)[0];
			if (route) routes[trip._trip.route_id] = route;
		}
	}

	let qrtDepartures: UpcomingQRTravelDeparture[] = getUpcomingQRTravelDepartures(stop_id);

	let mixed: (
		| (SerializableAugmentedStopTime & {
				dep_type: "gtfs";
				express_string: string;
				last_stop_id: string;
				scheduled_departure_time: string;
				actual_departure_time: string;
				departs_in: string;
				departsInSecs: number;
		  })
		| UpcomingQRTravelDeparture
	)[] = [...departures, ...qrtDepartures].sort((a, b) => {
		return (a.departsInSecs || 0) - (b.departsInSecs || 0);
	});

	let stations = TRAX.getStations()
		.map((v) => v.toSerializable())
		.sort((a, b) => (a.stop_name || "").localeCompare(b.stop_name || ""));

	return { stations, stop_id, departures: mixed, trips, routes };
};
