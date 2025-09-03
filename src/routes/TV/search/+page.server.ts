import TRAX, { type SerializableAugmentedStop } from 'translink-rail-api';
import { isTRAXLoaded, loadTRAX } from "$lib";
import type { PageServerLoad } from "./$types";
import { error } from "@sveltejs/kit";

export const load: PageServerLoad = async ({ url }) => {
    if (!isTRAXLoaded) {
        loadTRAX();
        throw error(503, "Loading TRAX data... Please retry in a few minutes.");
    }

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

    // Pagination
    const page = parseInt(url.searchParams.get("page") ?? "1", 10);
    const perPage = 20;
    let trips = TRAX.getAugmentedTrips();

    if (startStation.trim() !== "")
        trips = trips.filter(trip => trip.stopTimes[0].scheduled_parent_station?.stop_id == startStation ||
            trip.stopTimes[0].scheduled_stop?.stop_id == startStation
        );
    if (endStation.trim() !== "")
        trips = trips.filter(trip =>
            trip.stopTimes[trip.stopTimes.length - 1].scheduled_parent_station?.stop_id == endStation ||
            trip.stopTimes[trip.stopTimes.length - 1].scheduled_stop?.stop_id == endStation
        );
    for (const stop of intermediateStations)
        trips = trips.filter(trip => trip.stopTimes.some(st =>
            st.scheduled_parent_station?.stop_id === stop ||
            st.scheduled_stop?.stop_id === stop
        ));
    for (const date of serviceDates)
        trips = trips.filter(trip => trip.scheduledTripDates.includes(Number.parseInt(date)));
    if (trainNumberType.trim() !== "")
        trips = trips.filter(trip => trip.run[0].toLowerCase() === trainNumberType.toLowerCase());
    if (trainNumberDestination.trim() !== "")
        trips = trips.filter(trip => trip.run[1].toLowerCase() === trainNumberDestination.toLowerCase());

    let concatenated = false;
    let results = trips.length;

    // sort by .scheduledTripDates.sort()[0], then .stopTimes[0].scheduled_departure_timestamp, then .run
    trips = trips.sort((a, b) => {
        const aServiceDate = a.scheduledTripDates.sort()[0];
        const bServiceDate = b.scheduledTripDates.sort()[0];
        if (aServiceDate !== bServiceDate) {
            return aServiceDate - bServiceDate;
        }
        const aDepartureTime = a.stopTimes[0].scheduled_departure_timestamp ?? 0;
        const bDepartureTime = b.stopTimes[0].scheduled_departure_timestamp ?? 0;
        if (aDepartureTime !== bDepartureTime) return aDepartureTime - bDepartureTime;
        const runComparison = a.run.localeCompare(b.run);
        if (runComparison !== 0) return runComparison;
        return 0;
    });

    // Pagination logic
    const totalPages = Math.ceil(trips.length / perPage);
    const pagedTrips = trips.slice((page - 1) * perPage, page * perPage);
    if (trips.length > perPage) {
        concatenated = true;
    }

    // Capture original query params for pagination links
    const originalParams: Record<string, string[]> = {};
    for (const [key, value] of url.searchParams.entries()) {
        if (key !== "page") {
            if (!originalParams[key]) originalParams[key] = [];
            originalParams[key].push(value);
        }
    }

    let stations: { [key: string]: SerializableAugmentedStop } = {};
    for (const trip of pagedTrips) {
        for (const stopTime of trip.stopTimes) {
            if (stopTime.scheduled_stop) {
                stations[stopTime.scheduled_stop.stop_id] = stopTime.scheduled_stop.toSerializable();
            }
            if (stopTime.scheduled_parent_station) {
                stations[stopTime.scheduled_parent_station.stop_id] = stopTime.scheduled_parent_station.toSerializable();
            }
        }
    }

    let expressStrings: { [trip_id: string]: string } = {};
    for (const trip of pagedTrips) {
        const key = trip._trip.trip_id;
        expressStrings[key] = TRAX.express.findExpressString(trip.expressInfo, "");
    }

    return {
        filters: {
            startStation,
            endStation,
            intermediateStations,
            serviceDates,
            trainNumberType,
            trainNumberDestination
        },
        concatenated,
        results,
        perPage,
        trips: pagedTrips.map(v => v.toSerializable()),
        page,
        totalPages,
        stations,
        expressStrings,
        originalParams
    };
};
