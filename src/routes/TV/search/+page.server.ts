import TRAX, { type AugmentedStop } from "translink-rail-api";
import { isTRAXLoaded, isTRAXLoading, loadTRAX } from "$lib";
import type { PageServerLoad } from "./$types";
import type * as qdf from "qdf-gtfs";
import { error } from "@sveltejs/kit";

export const load: PageServerLoad = async ({ url }) => {
	if (!isTRAXLoaded) {
		loadTRAX();
		throw error(503, "Loading TRAX data... Please retry in a few minutes.");
	}

	if (isTRAXLoading) throw error(503, "Loading TRAX data... Please retry in a few minutes.");

	const startStation = url.searchParams.get("start-station") ?? "";
	const endStation = url.searchParams.get("end-station") ?? "";

	// Collect all intermediate stations
	const intermediateStations: string[] = [];
	for (const [key, value] of url.searchParams.entries()) {
		if (key.startsWith("intermediate-station")) {
			if (value !== "") {
				intermediateStations.push(value);
			}
		}
	}

	// Collect all service dates
	const serviceDates: string[] = [];
	for (const [key, value] of url.searchParams.entries()) {
		if (key.startsWith("service-date")) {
			if (value !== "") {
				serviceDates.push(value);
			}
		}
	}

	const trainNumberType = url.searchParams.get("train-number-type") ?? "";
	const trainNumberDestination = url.searchParams.get("train-number-destination") ?? "";
	const trainNumber = (url.searchParams.get("train-number") ?? "").trim().toUpperCase();

	if (trainNumber.length > 0 && trainNumber.length != 4)
		throw error(400, "Train number must be exactly 4 characters long.");

	if (!/^[A-Z0-9.]{0,4}$/.test(trainNumber))
		throw error(400, "Train number must be alphanumeric or '.' wildcard.");

	const route = url.searchParams.get("route") ?? "";
	const routeStart = url.searchParams.get("route-start") ?? "";
	const routeEnd = url.searchParams.get("route-end") ?? "";
	const routePair = url.searchParams.get("route-pair") ?? "";
	const routePairReversible = url.searchParams.get("route-pair-reversible") === "on";

	// Advanced options
	const dateMode = url.searchParams.get("date-mode") ?? "actual_sch";
	const extraDetails = url.searchParams.get("extra-details") === "on";

	// Pagination
	const page = parseInt(url.searchParams.get("page") ?? "1", 10);
	const perPage = 20;

	// We replace valid input characters with themselves, and '.' remains '.' (regex wildcard)
	let trainNumberRegex: RegExp | null = null;
	if (trainNumber !== "") {
		trainNumberRegex = new RegExp(`^${trainNumber}$`);
	}

	let trips = TRAX.getAugmentedTrips().flatMap((v) => v.instances).filter((inst) => {
		// Station filtering
		if (
			startStation.trim() !== "" &&
			!(
				inst.stopTimes[0].scheduled_parent_station?.stop_id == startStation ||
				inst.stopTimes[0].scheduled_stop?.stop_id == startStation
			)
		)
			return false;

		if (
			endStation.trim() !== "" &&
			!(
				inst.stopTimes[inst.stopTimes.length - 1].scheduled_parent_station?.stop_id == endStation ||
				inst.stopTimes[inst.stopTimes.length - 1].scheduled_stop?.stop_id == endStation
			)
		)
			return false;

		for (const stop of intermediateStations) {
			if (
				!inst.stopTimes.some(
					(st) =>
						!st.passing &&
						(st.scheduled_parent_station?.stop_id === stop || st.scheduled_stop?.stop_id === stop),
				)
			)
				return false;
		}

		// Route filtering
		if (routePair !== "" && inst.route_id.slice(0, 4) !== routePair)
			return (
				routePairReversible && inst.route_id.slice(0, 4) === routePair.slice(2, 4) + routePair.slice(0, 2)
			);
		if (route !== "" && !inst.route_id.slice(0, 4).includes(route)) return false;
		if (routeStart !== "" && inst.route_id.slice(0, 2) !== routeStart) return false;
		if (routeEnd !== "" && inst.route_id.slice(2, 4) !== routeEnd) return false;

		// Date filtering
		for (const date of serviceDates) {
			if (dateMode === "actual_sch") {
				if (!inst.scheduledTripDates.includes(date)) return false;
			} else if (dateMode === "actual_rt") {
				if (!inst.actualTripDates.includes(date)) return false;
			}
		}

		if (trainNumberType.trim() !== "" && inst.run[0].toLowerCase() !== trainNumberType.toLowerCase()) return false;
		if (trainNumberDestination.trim() !== "" && inst.run[1].toLowerCase() !== trainNumberDestination.toLowerCase())
			return false;
		if (trainNumberRegex && !trainNumberRegex.test(inst.run.trim().toUpperCase())) return false;

		return true;
	});

	let results = trips.length;

	const sortedTrips = [...trips].sort((a, b) => {
		let aServiceDate = "0",
			bServiceDate = "0";
		if (dateMode === "actual_sch") {
			aServiceDate = a.scheduledTripDates.sort()[0];
			bServiceDate = b.scheduledTripDates.sort()[0];
		} else if (dateMode === "actual_rt") {
			aServiceDate = a.actualTripDates.sort()[0];
			bServiceDate = b.actualTripDates.sort()[0];
		}
		if (aServiceDate !== bServiceDate) return aServiceDate.localeCompare(bServiceDate);

		const aDepartureTime = a.stopTimes[0].scheduled_departure_time ?? 0;
		const bDepartureTime = b.stopTimes[0].scheduled_departure_time ?? 0;
		if (aDepartureTime !== bDepartureTime) return aDepartureTime - bDepartureTime;

		const runComparison = a.run.localeCompare(b.run);
		if (runComparison !== 0) return runComparison;

		return 0;
	});

	const totalPages = Math.ceil(sortedTrips.length / perPage);
	const pagedTrips = sortedTrips.slice((page - 1) * perPage, page * perPage);
	let concatenated = sortedTrips.length > perPage;

	const originalParams: Record<string, string[]> = {};
	for (const [key, value] of url.searchParams.entries()) {
		if (key !== "page") {
			if (!originalParams[key]) originalParams[key] = [];
			originalParams[key].push(value);
		}
	}

	let stations: Record<string, AugmentedStop> = {};
	for (const trip of pagedTrips) {
		for (const stopTime of trip.stopTimes) {
			if (stopTime.scheduled_stop)
				stations[stopTime.scheduled_stop.stop_id] = stopTime.scheduled_stop as AugmentedStop;
			if (stopTime.scheduled_parent_station)
				stations[stopTime.scheduled_parent_station.stop_id] = stopTime.scheduled_parent_station as AugmentedStop;
			if (stopTime.actual_stop) stations[stopTime.actual_stop.stop_id] = stopTime.actual_stop as AugmentedStop;
			if (stopTime.actual_parent_station)
				stations[stopTime.actual_parent_station.stop_id] = stopTime.actual_parent_station as AugmentedStop;
		}
	}

	for (const st of TRAX.stations.getAugmentedRailStations()) stations[st.stop_id] = st as AugmentedStop;

	let expressStrings: { [trip_id: string]: string } = {};
	for (const trip of pagedTrips) {
		const key = trip.trip_id;
		expressStrings[key] = TRAX.express.findExpressString(trip.expressInfo, "");
	}

	let routesToFetch = [...new Set(pagedTrips.map((t) => t.route_id))];
	let routes: { [route_id: string]: qdf.Route } = {};
	for (const route_id of routesToFetch) {
		const route = TRAX.getRawRoutes(route_id)[0];
		if (route) routes[route_id] = route;
	}

	return {
		filters: {
			startStation,
			endStation,
			intermediateStations,
			serviceDates,
			trainNumberType,
			trainNumberDestination,
			useRT: dateMode === "actual_rt",
		},
		concatenated,
		results,
		perPage,
		trips: pagedTrips,
		page,
		totalPages,
		stations,
		expressStrings,
		originalParams,
		routes,
		extraDetails,
	};
};