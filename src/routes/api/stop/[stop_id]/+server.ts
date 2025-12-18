import {
	TRAX,
	getUpcomingQRTravelDepartures,
	isTRAXLoaded,
	isTRAXLoading,
	loadTRAX,
} from "$lib/server/trax";
import { formatTimestamp, type Departure, type UpcomingGTFSDeparture, type UpcomingQRTravelDeparture } from "$lib";
import * as qdf from "qdf-gtfs/types";
import { error, json } from "@sveltejs/kit";
import type { AugmentedTripInstance } from "translink-rail-api";

export async function GET({ params, locals }) {
	if (!isTRAXLoaded) {
		loadTRAX();
		throw error(503, "Loading TRAX data... Please retry in a few minutes.");
	}

	if (isTRAXLoading) throw error(503, "Loading TRAX data... Please retry in a few minutes.");

	const { stop_id } = params;

	let now = new Date(Date.now() + 10 * 3_600_000);
	let tomDate = new Date(now);
	tomDate.setUTCDate(tomDate.getUTCDate() + 1);

	let today = now.toISOString().split("T")[0].replaceAll("-", "");
	let startTime = (now.getUTCHours()).toString().padStart(2, "0") + ":" + now.getUTCMinutes().toString().padStart(2, "0") + ":00";
	let endTime = (now.getUTCHours() + 4).toString().padStart(2, "0") + ":" + now.getUTCMinutes().toString().padStart(2, "0") + ":00";

	let stop = TRAX.getAugmentedStops(stop_id)[0];
	if (stop === undefined || stop === null) throw error(404, `Stop with ID "${stop_id}" not found.`);
	let departures: UpcomingGTFSDeparture[] = TRAX.utils.departures.getDeparturesForStop(stop, today, startTime, endTime)
		.map((v) => {
			const actualTime = formatTimestamp(
				v.actual_departure_time ?? v.actual_arrival_time
					? Math.floor((v.actual_departure_time ?? v.actual_arrival_time ?? 0) / 60) * 60
					: v.actual_departure_time ?? v.actual_arrival_time,
			);
			const nowTime = `${now.getUTCHours().toString().padStart(2, "0")}:${now
				.getUTCMinutes()
				.toString()
				.padStart(2, "0")}`;
			const inst = TRAX.getAugmentedTripInstance(v.instance_id);
			return {
				...v,
				dep_type: "gtfs" as "gtfs",
				express_string: v.express_string,
				actual_departure_timestr: actualTime,
				scheduled_departure_timestr: formatTimestamp(
					v.scheduled_departure_time ?? v.scheduled_arrival_time,
				),
				last_stop_id:
					inst?.stopTimes?.at(-1)?.actual_parent_station?.stop_id ??
					inst?.stopTimes?.at(-1)?.actual_stop?.stop_id ??
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
				(a.actual_departure_time ?? a.actual_arrival_time ?? 0) -
				(b.actual_departure_time ?? b.actual_arrival_time ?? 0),
		);

	let instances: {
		[trip_id: string]: AugmentedTripInstance;
	} = {};
	for (const departure of departures) {
		const inst = TRAX.getAugmentedTripInstance(departure.instance_id);
		if (inst) instances[inst.instance_id] = inst;
	}

	let routesMap: {
		[route_id: string]: any;
	} = {};
	for (const trip of Object.values(instances)) {
		if (trip.route_id && !routesMap[trip.route_id]) {
			const route = TRAX.getRawRoutes(trip.route_id)[0];
			if (route) routesMap[trip.route_id] = route;
		}
	}

	let qrtDepartures: UpcomingQRTravelDeparture[] = getUpcomingQRTravelDepartures(stop_id);

	let mixed: Departure[] = [...departures, ...qrtDepartures].sort((a, b) => {
		return (a.departsInSecs ?? 0) - (b.departsInSecs ?? 0);
	});

	const extraDetails = locals.session?.data?.extraDetails ?? false;
	if (!extraDetails) {
		mixed = mixed.filter((v) => (v.dep_type === "gtfs" && !v.passing) || v.dep_type !== "gtfs");
		mixed = mixed.filter(
			(v) =>
				(v.dep_type === "gtfs" &&
					((v.realtime &&
						v.realtime_info?.schedule_relationship !== qdf.StopTimeScheduleRelationship.SKIPPED) || !v.realtime)) ||
				v.dep_type === "qrt",
		);
	}

	return json({ departures: mixed, instances, routes: routesMap, extraDetails });
}
