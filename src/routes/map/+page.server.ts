import { TRAX, isTRAXLoaded, isTRAXLoading, loadTRAX } from "$lib/server/trax";
import { error } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { formatTimestamp, type RealtimeVehiclePosition, type Route, type Shape } from "qdf-gtfs";

export const load: PageServerLoad = async ({ locals }) => {
	if (!isTRAXLoaded) {
		loadTRAX();
		throw error(503, "Loading TRAX data... Please retry in a few minutes.");
	}

	if (isTRAXLoading) throw error(503, "Loading TRAX data... Please retry in a few minutes.");

	let vps = TRAX.getVehiclePositions()
		.filter(v => TRAX.utils.isConsideredTripId(v.trip.trip_id))
		.map(v => {
			const inst = TRAX.getVehicleTripInstance(v);
			if (!inst) return null;
			return {
				trip: v.trip,
				position: v.position,
				vehicle: v.vehicle,
				instance_id: inst.instance_id,
				run: inst.run,
				route_id: inst.route_id,
				shape_id: inst.shape_id,
			};
		})
		.filter((v): v is any => v !== null);

	// Filter out vehicles that have finished their trip
	const now = new Date(Date.now() + 10 * 3_600_000);
	const nowSecs = now.getUTCHours() * 3600 + now.getUTCMinutes() * 60;

	vps = vps.filter((v) => {
		const fullInst = TRAX.getAugmentedTripInstance(v.instance_id);
		let st = fullInst?.stopTimes.at(-1);
		if (!st) return false;
		const depTime = st.actual_departure_time ?? st.actual_arrival_time;
		if (depTime === null) return true;
		// Keep if it hasn't passed the last stop by more than 5 minutes
		let diff = depTime - nowSecs;
		if (diff < -43200) diff += 86400; // Handle midnight wrap
		return diff >= -300;
	});

	const shapes: { points: Shape[]; color: string }[] = [];

	// Select one train going from each of:
	let selection = [
		{ from: "place_rossta", to: "place_namsta" },
		{ from: "place_romsta", to: "place_gymsta" },
		{ from: "place_romsta", to: "place_exhsta" },
		{ from: "place_romsta", to: "place_dbnsta" },
		{ from: "place_varsta", to: "place_domsta" },
		{ from: "place_clesta", to: "place_shnsta" },
		{ from: "place_clesta", to: "place_sgtsta" },
		{ from: "place_spcsta", to: "place_kprsta" },
		{ from: "place_fersta", to: "place_beesta" },
	]

	for (const trip of TRAX.getAugmentedTrips().filter(trip => trip.instances.some(i =>
		selection.some(v =>
			(v.from === i.stopTimes.at(0)?.scheduled_parent_station_id
				|| v.from === i.stopTimes.at(0)?.scheduled_stop_id) &&
			(v.to === i.stopTimes.at(-1)?.scheduled_parent_station_id
				|| v.to === i.stopTimes.at(-1)?.scheduled_stop_id)
		)
	))) {
		let chosI = trip.instances.find(i =>
			selection.some(v =>
				(v.from === i.stopTimes.at(0)?.scheduled_parent_station_id
					|| v.from === i.stopTimes.at(0)?.scheduled_stop_id) &&
				(v.to === i.stopTimes.at(-1)?.scheduled_parent_station_id
					|| v.to === i.stopTimes.at(-1)?.scheduled_stop_id)
			)
		);
		if (!chosI) continue;
		if (!chosI?.shape_id) continue;
		const { shape_id, route_id } = chosI;
		let sel = selection.findIndex(v =>
			(v.from === chosI?.stopTimes.at(0)?.scheduled_parent_station_id
				|| v.from === chosI?.stopTimes.at(0)?.scheduled_stop_id) &&
			(v.to === chosI?.stopTimes.at(-1)?.scheduled_parent_station_id
				|| v.to === chosI?.stopTimes.at(-1)?.scheduled_stop_id)
		);
		let shape = TRAX.gtfs.getShape(shape_id);
		let route = TRAX.gtfs.getRoute(route_id);
		if (!shape || !route) continue;
		shapes.push({
			points: shape,
			color: route.route_color ?? "000000"
		});
		selection[sel] = undefined as any;
		selection = selection.filter(v => v);
		if (selection.length == 0) break;
	}

	let routesMap: { [key: string]: Route } = {};
	TRAX.getRawRoutes().forEach(v => routesMap[v.route_id] = v);

	let stops = TRAX.getStations();
	const stopsWithCoords = stops.filter((v) => v.stop_lat != null && v.stop_lon != null);
	let bounds: {
		min_lat: number;
		min_lon: number;
		max_lat: number;
		max_lon: number;
	} | null = null;

	if (stopsWithCoords.length > 0) {
		bounds = {
			min_lat: Math.min(...stopsWithCoords.map((v) => v.stop_lat!)),
			min_lon: Math.min(...stopsWithCoords.map((v) => v.stop_lon!)),
			max_lat: Math.max(...stopsWithCoords.map((v) => v.stop_lat!)),
			max_lon: Math.max(...stopsWithCoords.map((v) => v.stop_lon!)),
		};
	}

	return {
		vps,
		shapes,
		bounds,
		stops,
		routes: routesMap,
		extraDetails: locals.session?.data.extraDetails ?? false,
	};
};
