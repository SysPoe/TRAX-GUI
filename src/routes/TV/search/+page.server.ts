import TRAX, { type SerializableAugmentedStop } from "translink-rail-api";
import { isTRAXLoaded, isTRAXLoading, loadTRAX } from "$lib";
import type { PageServerLoad } from "./$types";
import type * as gtfs from "gtfs";
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
	if (!/^[A-Z0-9]{0,4}$/.test(trainNumber)) throw error(400, "Train number must be alphanumeric.");

	const route = url.searchParams.get("route") ?? "";
	const routeStart = url.searchParams.get("route-start") ?? "";
	const routeEnd = url.searchParams.get("route-end") ?? "";
	const routePair = url.searchParams.get("route-pair") ?? "";
	const routePairReversible = url.searchParams.get("route-pair-reversible") === "on";

	// Advanced options
	const dateMode = url.searchParams.get("date-mode") ?? "actual_sch";
	const rsLeaderBehaviour = url.searchParams.get("rs-leader-behaviour") ?? "include";
	const multiDateBehaviour = url.searchParams.get("multi-date-behaviour") ?? "original";
	const extraDetails = url.searchParams.get("extra-details") === "on";

	// Pagination
	const page = parseInt(url.searchParams.get("page") ?? "1", 10);
	const perPage = 20;
	let trips = TRAX.getAugmentedTrips().filter((trip) => {
		if (
			startStation.trim() !== "" &&
			!(
				trip.stopTimes[0].scheduled_parent_station?.stop_id == startStation ||
				trip.stopTimes[0].scheduled_stop?.stop_id == startStation
			)
		)
			return false;

		if (
			endStation.trim() !== "" &&
			!(
				trip.stopTimes[trip.stopTimes.length - 1].scheduled_parent_station?.stop_id == endStation ||
				trip.stopTimes[trip.stopTimes.length - 1].scheduled_stop?.stop_id == endStation
			)
		)
			return false;

		for (const stop of intermediateStations) {
			if (
				!trip.stopTimes.some(
					(st) =>
						!st.passing &&
						(st.scheduled_parent_station?.stop_id === stop || st.scheduled_stop?.stop_id === stop),
				)
			)
				return false;
		}

		if (routePair !== "" && trip._trip.route_id.slice(0, 4) !== routePair)
			return (
				routePairReversible && trip._trip.route_id.slice(0, 4) === routePair.slice(2, 4) + routePair.slice(0, 2)
			);
		if (route !== "" && !trip._trip.route_id.slice(0, 4).includes(route)) return false;
		if (routeStart !== "" && trip._trip.route_id.slice(0, 2) !== routeStart) return false;
		if (routeEnd !== "" && trip._trip.route_id.slice(2, 4) !== routeEnd) return false;

		for (const date of serviceDates) {
			if (dateMode === "actual_sch") {
				if (!trip.scheduledTripDates.includes(date)) return false;
			} else if (dateMode === "actual_rt") {
				if (!trip.actualTripDates.includes(date)) return false;
			} else if (dateMode === "GTFS") {
				if (!trip.scheduledStartServiceDates.includes(date)) return false;
			}
		}

		if (trainNumberType.trim() !== "" && trip.run[0].toLowerCase() !== trainNumberType.toLowerCase()) return false;
		if (trainNumberDestination.trim() !== "" && trip.run[1].toLowerCase() !== trainNumberDestination.toLowerCase())
			return false;
		if (trainNumber !== "" && trip.run.trim().toUpperCase() !== trainNumber) return false;

		if (rsLeaderBehaviour !== "include") {
			const isLeader =
				[...new Set(Object.values(trip.runSeries))].length == 1 &&
				trip.runSeries[Number.parseInt(Object.keys(trip.runSeries)[0])] === trip.run;
			if (rsLeaderBehaviour === "only" && !isLeader) return false;
			if (rsLeaderBehaviour === "exclude" && isLeader) return false;
		}

		return true;
	});

	let serializedTrips = trips.map((v) => v.toSerializable());

	if (multiDateBehaviour === "duplicate")
		serializedTrips = serializedTrips
			.map((trip) => {
				const dates =
					dateMode === "actual_sch"
						? trip.scheduledTripDates
						: dateMode === "actual_rt"
							? trip.actualTripDates
							: trip.scheduledStartServiceDates;
				let expanded = dates.map((v) => ({
					...trip,
					actualTripDates: [v],
					scheduledTripDates: [v],
					scheduledStartServiceDates: [v],
				}));
				expanded = expanded.filter((v) => {
					for (const date of serviceDates)
						if (!v.scheduledTripDates.includes(date)) return false;
					return true;
				});
				return expanded;
			})
			.flat();

	let results = serializedTrips.length;

	serializedTrips = serializedTrips.sort((a, b) => {
		let aServiceDate = "0",
			bServiceDate = "0";
		if (dateMode === "actual_sch") {
			aServiceDate = a.scheduledTripDates.sort()[0];
			bServiceDate = b.scheduledTripDates.sort()[0];
		} else if (dateMode === "actual_rt") {
			aServiceDate = a.actualTripDates.sort()[0];
			bServiceDate = b.actualTripDates.sort()[0];
		} else if (dateMode === "GTFS") {
			aServiceDate = a.scheduledStartServiceDates.sort()[0];
			bServiceDate = b.scheduledStartServiceDates.sort()[0];
		}
		if (aServiceDate !== bServiceDate) return aServiceDate.localeCompare(bServiceDate);

		const aDepartureTime = a.stopTimes[0].scheduled_departure_time ?? 0;
		const bDepartureTime = b.stopTimes[0].scheduled_departure_time ?? 0;
		if (aDepartureTime !== bDepartureTime) return aDepartureTime - bDepartureTime;

		const runComparison = a.run.localeCompare(b.run);
		if (runComparison !== 0) return runComparison;

		return 0;
	});

	// Pagination logic
	const totalPages = Math.ceil(serializedTrips.length / perPage);
	const pagedTrips = serializedTrips.slice((page - 1) * perPage, page * perPage);
	const unserializedPagedTrips = trips.slice((page - 1) * perPage, page * perPage);
	let concatenated = serializedTrips.length > perPage;

	// Capture original query params for pagination links
	const originalParams: Record<string, string[]> = {};
	for (const [key, value] of url.searchParams.entries()) {
		if (key !== "page") {
			if (!originalParams[key]) originalParams[key] = [];
			originalParams[key].push(value);
		}
	}

	let stations: { [key: string]: SerializableAugmentedStop } = {};
	for (const trip of unserializedPagedTrips) {
		for (const stopTime of trip.stopTimes) {
			if (stopTime.scheduled_stop) {
				stations[stopTime.scheduled_stop.stop_id] = stopTime.scheduled_stop.toSerializable();
			}
			if (stopTime.scheduled_parent_station) {
				stations[stopTime.scheduled_parent_station.stop_id] =
					stopTime.scheduled_parent_station.toSerializable();
			}
		}
	}

	let expressStrings: { [trip_id: string]: string } = {};
	for (const trip of pagedTrips) {
		const key = trip._trip.trip_id;
		expressStrings[key] = TRAX.express.findExpressString(trip.expressInfo, "");
	}

	let routesToFetch = [...new Set(pagedTrips.map((t) => t._trip.route_id))];
	let routes: { [route_id: string]: gtfs.Route } = {};
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
