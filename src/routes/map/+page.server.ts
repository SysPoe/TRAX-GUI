import { TRAX, isTRAXLoaded, isTRAXLoading, loadTRAX } from "$lib/server/trax";
import { error } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import type { AugmentedTripInstance } from "translink-rail-api";
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
                shape_id: inst.shape_id
            };
        }).filter((v): v is any => v !== null);

    // Filter out vehicles that have finished their trip
    const now = new Date(Date.now() + 10 * 3_600_000);
    const nowSecs = now.getUTCHours() * 3600 + now.getUTCMinutes() * 60;

    vps = vps.filter(v => {
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

    let biggest = { stop_lat: -27.4661, stop_lon: 153.0244, stop_id: "CENTRAL", stop_name: "Central Station" };

    let routesMap: { [key: string]: Route } = {};
    const uniqueRouteIds = [...new Set(vps.map(v => v.route_id))];
    uniqueRouteIds.forEach(id => {
        const r = TRAX.gtfs.getRoute(id);
        if (r) routesMap[id] = r;
    });

    let stops = TRAX.getStations();

    return {
        vps, biggest, stops, routes: routesMap, extraDetails:
            locals.session?.data.extraDetails ?? false
    }
}
