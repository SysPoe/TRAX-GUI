import { TRAX, isTRAXLoaded, isTRAXLoading, loadTRAX } from "$lib/server/trax";
import { error } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import type { AugmentedTripInstance } from "translink-rail-api";
import type { RealtimeVehiclePosition, Route, Shape } from "qdf-gtfs";

export const load: PageServerLoad = async ({ locals }) => {
    if (!isTRAXLoaded) {
        loadTRAX();
        throw error(503, "Loading TRAX data... Please retry in a few minutes.");
    }

    if (isTRAXLoading) throw error(503, "Loading TRAX data... Please retry in a few minutes.");

    let vps: (RealtimeVehiclePosition & { tripInstance: AugmentedTripInstance | null })[] = TRAX.getVehiclePositions()
        .filter(v => TRAX.utils.isConsideredTripId(v.trip.trip_id))
        .map(v => ({
            ...v,
            tripInstance: TRAX.getVehicleTripInstance(v)
        }));

    let stationCount: { [key: string]: number } = {};

    vps.forEach(v => v.tripInstance?.stopTimes.forEach(st => {
        if (st.actual_stop_id) {
            if (!stationCount[st.actual_stop_id]) stationCount[st.actual_stop_id] = 0;
            stationCount[st.actual_stop_id]++;
        }
        if (st.actual_parent_station_id) {
            if (!stationCount[st.actual_parent_station_id]) stationCount[st.actual_parent_station_id] = 0;
            stationCount[st.actual_parent_station_id]++;
        }
    }));

    let biggest = TRAX.getAugmentedStops(Object.keys(stationCount).reduce((a, b) => stationCount[a] > stationCount[b] ? a : b))[0];

    let routes = [...new Set(vps.map(v => v.tripInstance?.route_id).filter(r => r).map(v => TRAX.gtfs.getRoute(v ?? "")).filter(v => v))];
    let routesMap: { [key: string]: Route } = {};
    routes.forEach(r => {
        if (r) routesMap[r.route_id] = r;
    });

    let stops = TRAX.getStations();

    let shapesIds: { shape_id: string, route_id: string }[] = []; // TODO loom
    vps.map(v => ({ shape_id: v.tripInstance?.shape_id, route_id: v.tripInstance?.route_id })).filter(v => v.shape_id && v.route_id).forEach(s => {
        if (shapesIds.some(q => q.shape_id === s.shape_id)) return;
        shapesIds.push({ shape_id: s.shape_id!, route_id: s.route_id! });
    })
    let shapes: { [key: string]: (Shape & { color: string })[] } = {};

    for (const shapeId of shapesIds) {
        let shape = (TRAX.gtfs.getShape(shapeId.shape_id!) ?? []);
        let route = TRAX.gtfs.getRoute(shapeId.route_id!);
        if (shape) shapes[shapeId.shape_id!] = shape.map(v => ({ ...v, color: route?.route_color ? `#${route.route_color}` : '#0000FF' }));
    }


    return { vps, shapes, biggest, stops, routes: routesMap }
};
