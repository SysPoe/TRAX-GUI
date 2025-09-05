import TRAX from 'translink-rail-api';
import { isTRAXLoaded, loadTRAX } from "$lib";
import { error } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import type { SerializableAugmentedStop } from 'translink-rail-api';

export const load: PageServerLoad = async ({ params }) => {
    if (!isTRAXLoaded) {
        loadTRAX();
        throw error(503, "Loading TRAX data... Please retry in a few minutes.");
    }
    let { trip_id } = params;
    let trip = TRAX.getAugmentedTrips(trip_id)[0];
    if (!trip) throw error(404, `Trip "${trip_id}" not found`);
    let stations: { [stop_id: string]: SerializableAugmentedStop } = {};
    let route = TRAX.getRawRoutes(trip._trip.route_id)[0];
    let expressString = TRAX.express.findExpressString(trip.expressInfo);

    for (const stopTime of trip.stopTimes) {
        stations[stopTime.scheduled_stop?.stop_id as any as string] = stopTime.scheduled_stop?.toSerializable() as any;
        if (stopTime.scheduled_parent_station)
            stations[stopTime.scheduled_parent_station?.stop_id as any as string] = stopTime.scheduled_parent_station?.toSerializable() as any;
    }

    return { trip: trip.toSerializable(), stations, route, expressString };
};
